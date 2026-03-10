package ws

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/remotecommand"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// UpgradeWebSocket 升级 HTTP 连接为 WebSocket
func UpgradeWebSocket(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	return upgrader.Upgrade(w, r, nil)
}

// StreamPodLogs 通过 WebSocket 流式传输 Pod 日志
func StreamPodLogs(ws *websocket.Conn, clientset *kubernetes.Clientset, namespace, podName, container string, tailLines int64, follow bool) {
	defer ws.Close()

	opts := &corev1.PodLogOptions{
		Container:  container,
		Follow:     follow,
		TailLines:  &tailLines,
		Timestamps: true,
	}

	req := clientset.CoreV1().Pods(namespace).GetLogs(podName, opts)
	stream, err := req.Stream(context.Background())
	if err != nil {
		ws.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("[错误] 获取日志流失败: %v", err)))
		return
	}
	defer stream.Close()

	scanner := bufio.NewScanner(stream)
	// 增大 buffer 以处理超长日志行
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()
		if err := ws.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			return // 客户端断开
		}
	}

	if err := scanner.Err(); err != nil {
		ws.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("[错误] 日志读取中断: %v", err)))
	}
}

// TerminalSession WebSocket 终端会话
type TerminalSession struct {
	ws   *websocket.Conn
	done chan struct{}
}

// NewTerminalSession 创建终端会话
func NewTerminalSession(ws *websocket.Conn) *TerminalSession {
	return &TerminalSession{ws: ws, done: make(chan struct{})}
}

// Read 实现 io.Reader —— 从 WebSocket 读取用户输入
func (t *TerminalSession) Read(p []byte) (int, error) {
	_, message, err := t.ws.ReadMessage()
	if err != nil {
		return 0, err
	}
	n := copy(p, message)
	return n, nil
}

// Write 实现 io.Writer —— 将终端输出写入 WebSocket
func (t *TerminalSession) Write(p []byte) (int, error) {
	if err := t.ws.WriteMessage(websocket.TextMessage, p); err != nil {
		return 0, err
	}
	return len(p), nil
}

// Done 返回完成信号
func (t *TerminalSession) Done() <-chan struct{} {
	return t.done
}

// Close 关闭会话
func (t *TerminalSession) Close() {
	close(t.done)
	t.ws.Close()
}

// Next 实现 remotecommand.TerminalSizeQueue
func (t *TerminalSession) Next() *remotecommand.TerminalSize {
	// 返回默认终端大小，后续可扩展为从客户端动态获取
	return &remotecommand.TerminalSize{Width: 120, Height: 40}
}

// ExecInPod 通过 WebSocket 在 Pod 中执行命令（交互式终端）
func ExecInPod(ws *websocket.Conn, clientset *kubernetes.Clientset, config *rest.Config, namespace, podName, container string) {
	defer ws.Close()

	session := NewTerminalSession(ws)
	defer session.Close()

	cmd := []string{"/bin/sh", "-c", "TERM=xterm-256color; export TERM; [ -x /bin/bash ] && exec /bin/bash || exec /bin/sh"}

	req := clientset.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("exec").
		VersionedParams(&corev1.PodExecOptions{
			Container: container,
			Command:   cmd,
			Stdin:     true,
			Stdout:    true,
			Stderr:    true,
			TTY:       true,
		}, scheme.ParameterCodec)

	exec, err := remotecommand.NewSPDYExecutor(config, "POST", req.URL())
	if err != nil {
		ws.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n[错误] 创建执行器失败: %v\r\n", err)))
		return
	}

	// 超时上下文（30 分钟空闲断开）
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	err = exec.StreamWithContext(ctx, remotecommand.StreamOptions{
		Stdin:             session,
		Stdout:            session,
		Stderr:            session,
		Tty:               true,
		TerminalSizeQueue: session,
	})

	if err != nil {
		ws.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n[会话结束] %v\r\n", err)))
	}
}

// ReadCloserToWebSocket 将 io.ReadCloser 的内容实时写入 WebSocket
func ReadCloserToWebSocket(ws *websocket.Conn, rc io.ReadCloser) {
	defer rc.Close()
	buf := make([]byte, 4096)
	for {
		n, err := rc.Read(buf)
		if n > 0 {
			if writeErr := ws.WriteMessage(websocket.TextMessage, buf[:n]); writeErr != nil {
				return
			}
		}
		if err != nil {
			return
		}
	}
}
