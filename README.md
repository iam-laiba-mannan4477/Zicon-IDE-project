# 🌌 Zicon-IDE – Cloud & Local Full-Stack IDE

A browser-based IDE for web and cloud development with **real VSCode extension support**, containerized workspaces, and live collaboration.

---

## 🎯 Overview

Zicon-IDE brings professional-grade development experience to your browser or local machine:

✅ Real VSCode extensions support via Extension Host  
✅ Frontend powered by React + Monaco Editor  
✅ Backend Node.js server managing extensions & workspace  
✅ Containerized workspace for safe and isolated development  
✅ Marketplace UI for browsing and installing extensions  
✅ Live collaboration via WebSockets  

---

## 🏗️ System Architecture

### 🧩 Architecture Overview

The system uses a **client–server–extension host** model:

- **Frontend:** React + Monaco Editor for code editing and UI  
- **Backend:** Node.js server handling API, workspace management, and extension host  
- **VSCode Extension Host:** Runs real `.vsix` extensions in the container  
- **Containerization:** Docker-based isolated workspaces  
- **Database (optional):** Stores user settings, preferences, and extensions metadata  

---

## 🎨 Frontend

Built with **React + Vite + Tailwind CSS + shadcn/ui components**

**Key Components:**

- **Editor** → Monaco Editor instance with real VSCode extension support  
- **Extensions Panel** → Browse, install, and manage VSCode extensions  
- **Terminal** → Full terminal inside container workspace  
- **File Explorer** → View and manage project files  

**Libraries & Tools:**

- React, React Hooks, React Router  
- Tailwind CSS  
- shadcn/ui for reusable components  
- Socket.IO for live collaboration  

---

## ⚙️ Backend

Node.js server managing:

- **Extension Host:** Runs VSCode extensions using `vscode-jsonrpc` & `vscode-languageclient`  
- **Workspace API:** Serves frontend requests and executes extension commands  
- **Container API:** Manage per-user workspace containers  

**Key Scripts:**

- `extractExtensions.js` → Extracts `.vsix` files into installed-extensions  
- `extensionHost.js` → Starts VSCode Extension Host process  
- `server.js` → Main backend entry point  

---

## 🔄 Data Flow

1. User types code in Monaco Editor  
2. Frontend sends request via WebSocket to backend  
3. Backend extension host executes the requested VSCode extension functionality  
4. Response returned to frontend → autocomplete, formatting, linting, etc.

---

## 📦 File Structure

```text
zicon-ide/
├── backend/                  # Node server + extension host
│   ├── server.js
│   ├── extensionHost.js
│   └── extractExtensions.js
├── frontend/                 # React + Monaco Editor
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── node_modules/
├── extensions/               # .vsix files
├── Dockerfile
├── package.json
└── README.md

🛠️ Development Tools & Commands

Development Tools:

Node.js (frontend runtime)

Vite (frontend build)

pnpm (package manager)

Docker (containerized workspace)

Commands:

Install dependencies:

pnpm i

Start frontend + backend concurrently:

pnpm run dev

This runs:

Backend server (pnpm --filter ../backend start)

Frontend Vite server (vite --host 0.0.0.0)

Build frontend:

pnpm run build

Add dependencies:

pnpm add <dependency>

Fix missing concurrently on Windows:

pnpm add -D concurrently
🚀 Deployment & Infrastructure
🎯 Overview

Zicon-IDE runs in containerized environments with VSCode Extension Host enabled:

Docker: Frontend + backend in isolated containers

Extension Host: Supports real VSCode .vsix extensions

WebSocket API: Connects Monaco Editor to backend extension host

Optional Kubernetes Deployment: For multi-user cloud IDE

🐳 Docker

Dockerfile defines backend & frontend container images

Build and run containers:

docker build -t zicon-ide .
docker run -d -p 5001:5000 zicon-ide

Frontend accessible at http://localhost:5001

☸️ Kubernetes (Optional)

Deployments for frontend/backend pods

Services for internal communication

Ingress configured for HTTPS access

🔄 CI/CD

Docker image build & push

Kubernetes manifests deployment

Auto-sync GitOps with ArgoCD (optional)

💡 Local Development

Clone the repo:

git clone https://github.com/iam-laiba-mannan4477/ZiCon-ide-project-new.git
cd ZiCon-ide-project-new

Install dependencies:

pnpm i

Start backend & frontend:

cd app/frontend
pnpm run dev

Open browser at http://localhost:5000 (or mapped port)

🧠 Notes & Tips

Use .gitignore to avoid pushing node_modules/ and dist/

Add .vsix files to extensions/ folder to auto-install

Ensure backend listens on 0.0.0.0 for Docker access

If pnpm linking fails (EACCES), try:

pnpm install --unsafe-perm

Remove old node_modules & lock files if needed:

rm -rf node_modules pnpm-lock.yaml
pnpm install
🌌 Next Steps

Add more VSCode extensions in extensions/

Implement extension marketplace UI

Add live collaboration & multi-user container support

Consider Kubernetes deployment for production-grade IDE