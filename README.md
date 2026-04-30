# CubeShare 🧊

CubeShare is an experimental, high-performance web application that reimagines file and text sharing through a spatial, interactive 3D interface. Instead of traditional flat menus, users navigate the platform by interacting with a physicalized "Craft" cube, merging modern Peer-to-Peer (P2P) technology with immersive web design.

## 🌟 The Core Experience: "The Craft"

At the heart of the application is an interactive 3D Cube built entirely with **CSS 3D Transforms** and custom **React physics hooks**.

- **Spatial Navigation**: Users rotate the cube on its X and Y axes to switch between application states:
  - **Front Face**: Authentication and Main Dashboard.
  - **Left Face**: The Gallery (Local file management).
  - **Right Face**: User Profile and Peer settings.
  - **Back Face**: The Transfer Control Center.
- **Kinetic Physics**: Implemented via `RequestAnimationFrame`, the cube features momentum-based "flicking," friction-deceleration, and magnetic snapping to the nearest face.
- **Dynamic Storytelling**: An automated character-advancing overlay scrolls behind the cube based on rotation speed, providing a "retro-cyber" aesthetic.

## 🛠️ Key Technical Features

### 1. Peer-to-Peer Data Engine

CubeShare utilizes **WebRTC (Web Real-Time Communication)** to facilitate direct data transfers.

- **Zero Server Storage**: Files and text shared between users never touch the server's disk, ensuring maximum privacy and bandwidth efficiency.
- **Data Channels**: Uses binary data channels for low-latency, reliable transfer of blobs and strings.
- **Real-time Signaling**: A Node.js WebSocket server acts as the "matchmaker," coordinating handshakes (Offers/Answers/ICE Candidates) between peers.

### 2. Intelligent Discovery

The application includes a "Nearby" feature that groups users based on their network topology.

- **Public IP Grouping**: By analyzing the `x-forwarded-for` headers during the WebSocket handshake, the server identifies users on the same local network, allowing for instant discovery without requiring manual room codes.
- **Ad-hoc Rooms**: For users across different networks, a 6-digit room code system allows for secure, temporary signaling channels.

### 3. Advanced Local File Store

To handle received data without a backend database for files, CubeShare uses a custom **IndexedDB-powered FileStore**.

- **Persistence**: Files remain available across browser refreshes.
- **Universal Preview**: Built-in support for rendering image previews, video playback, and text syntax highlighting for received assets.
- **Cross-Tab Sync**: Utilizing the **BroadcastChannel API**, data received in one browser tab is instantly mirrored to all other open tabs of the application.

## 🛡️ The Tech Stack

### Frontend

- **React & Vite**: Chosen for lightning-fast Hot Module Replacement (HMR) and optimized production builds.
- **Context API**: Manages global state for Authentication and P2P connectivity.
- **Custom Hooks**: High-level abstractions for WebRTC logic (`useWebRTC`) and File System access (`useFileStore`).

### Backend (Signaling & Auth)

- **Node.js & Express**: The foundation for the API and signaling infrastructure.
- **WebSockets (`ws`)**: Provides the persistent bi-directional channel needed for real-time signaling and presence tracking.
- **PostgreSQL**: Stores user identity and hashed credentials.
- **Security Suite**:
  - **JWT (JSON Web Tokens)**: Secure, stateless session management.
  - **Bcrypt**: Industrial-grade password hashing.
  - **Helmet.js**: Sets various HTTP headers to protect against common web vulnerabilities.
  - **Express Rate Limit**: Protects authentication endpoints from brute-force attacks.

## 🎨 Design Philosophy

CubeShare blends **Retro-Gloss** aesthetics with modern minimalism. The UI uses glassmorphism, rainbow gradients, and pixel-inspired iconography to create a high-contrast, energetic environment that reflects the speed of P2P transfers.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (for user authentication)
- **npm** or **yarn**

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd CubeShare
   ```

2. **Backend Setup**
   - Navigate to the backend folder: `cd backend`
   - Install dependencies: `npm install`
   - Create an environment file at `backend/custom/path/.env` (Note: the project uses a custom path for configuration).
   - Add the following variables:
     ```env
     PORT=6700
     DATABASE_URL=your_postgresql_url
     JWT_SECRET=your_jwt_secret
     FRONTEND_URL=http://localhost:5173
     ```
   - Start the server: `npm start`

3. **Frontend Setup**
   - Navigate to the frontend folder: `cd ../frontend`
   - Install dependencies: `npm install`
   - Start the development server: `npm run dev`

## 📂 Project Structure

```text
├── backend/
│   ├── custom/path/    # Custom configuration and .env location
│   ├── src/
│   │   ├── routes/     # Auth and User API endpoints
│   │   ├── signaling.js # WebRTC signaling logic
│   │   └── server.js    # Express & WebSocket entry point
├── frontend/
│   ├── src/
│   │   ├── components/ # 3D Cube and UI elements
│   │   ├── hooks/      # WebRTC and FileStore logic
│   │   ├── pages/      # Cube faces (Gallery, Profile, etc.)
│   │   └── App.jsx     # Main entry point
└── README.md
```

---

_Created with passion by Minaar._
