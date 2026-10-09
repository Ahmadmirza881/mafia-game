import os
import signal
import socket
import subprocess
import sys
import time
import webbrowser

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    local_ip = get_local_ip()

    print("===================================================")
    print("  MAFIA SECRET CARD DISTRIBUTION SYSTEM LAUNCHER   ")
    print("===================================================")

    # 1. Start Backend on 0.0.0.0
    print("[1/3] Starting FastAPI backend on 0.0.0.0:8000 ...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=root_dir)

    # 2. Start Frontend on 0.0.0.0
    print("[2/3] Starting Vite frontend on 0.0.0.0:5173 ...")
    frontend_cmd = "npm run dev -- --host 0.0.0.0 --port 5173"
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir, shell=True)

    # 3. Open browser after brief delay
    time.sleep(2.5)
    print(f"[3/3] Opening application in browser: http://localhost:5173 ...")
    try:
        webbrowser.open("http://localhost:5173")
    except Exception:
        pass

    print("\n===================================================")
    print("APPLICATION RUNNING SUCCESSFULLY FOR PC & PHONES!")
    print("===================================================")
    print(f"💻 On this PC        : http://localhost:5173")
    print(f"📱 On Mobile Phones  : http://{local_ip}:5173")
    print(f"📡 Backend API       : http://{local_ip}:8000")
    print("===================================================")
    print("NOTE: Make sure your phones are on the SAME Wi-Fi network!")
    print(f"Players simply open: http://{local_ip}:5173 in their phone browser.")
    print("Press Ctrl+C at any time to stop both servers.")
    print("===================================================\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping servers...")
        try:
            backend_proc.terminate()
        except Exception:
            pass
        try:
            if sys.platform == "win32":
                subprocess.call(["taskkill", "/F", "/T", "/PID", str(frontend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                frontend_proc.terminate()
        except Exception:
            pass
        print("Done. Goodbye!")

if __name__ == "__main__":
    main()
