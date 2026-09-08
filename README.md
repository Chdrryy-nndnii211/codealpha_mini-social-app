# Mini Social Media App 🚀

[![Live Website](https://img.shields.io/badge/Live%20Demo-Online-success?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chdrryy-nndnii211.github.io/mini-social-app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/Chdrryy-nndnii211/mini-social-app)

> 🌐 **Live Website URL**: **[https://chdrryy-nndnii211.github.io/mini-social-app/](https://chdrryy-nndnii211.github.io/mini-social-app/)**  
> 💻 **GitHub Repository**: **[https://github.com/Chdrryy-nndnii211/mini-social-app](https://github.com/Chdrryy-nndnii211/mini-social-app)**

---

A full-stack, responsive mini social media web application built with **Node.js, Express, MongoDB (Mongoose), JWT Authentication**, and **Vanilla HTML, CSS, JavaScript** (Fetch API).


---

## 📸 Features

- **Authentication**: JWT-based user signup and login with secure password hashing (`bcryptjs`).
- **Personalized Profile**: View avatar, bio, post count, and follower / following metrics. Edit bio and profile picture dynamically.
- **Social Graph**: Follow and unfollow users with real-time optimistic counter updates. View list of followers and following.
- **Social Feed**: Chronological feed of posts with author info, images, and relative timestamps (e.g. "Just now", "5m ago").
- **Post Management**: Create rich posts with text and optional image URLs. Delete own posts with confirmation.
- **Optimistic Likes**: Instant like/unlike toggle with animated heart icon and live counter syncing with the database.
- **Interactive Comments**: Single post detail view with chronological comments stream, add new comment, and delete own comment.
- **Clean Responsive UI**: Modern Instagram / Twitter-inspired design with centered cards, mobile responsiveness, floating toasts, and loading spinners.
- **Zero-Config Database**: Seamlessly connects to your MongoDB instance (local or Atlas) or automatically falls back to an in-memory database for immediate out-of-the-box development!

---

## 🛠 Tech Stack

- **Frontend**: Plain HTML5, CSS3, Vanilla JavaScript (ES6+ Fetch API, localStorage)
- **Backend**: Node.js, Express.js, CORS, dotenv
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT) + bcryptjs

---

## 📁 Project Structure

```
mini-social-app/
├── client/                     # Frontend Vanilla Web App
│   ├── index.html              # Login page
│   ├── signup.html             # Registration page
│   ├── feed.html               # Main social feed & Create Post
│   ├── profile.html            # Profile page & Edit modal
│   ├── post.html               # Single post & full comments section
│   ├── css/
│   │   └── style.css           # Modern design system & responsive styling
│   └── js/
│       ├── api.js              # Shared API client, auth guards, toasts, navbar
│       ├── login.js            # Login form validation & auth
│       ├── signup.js           # Signup form validation & account creation
│       ├── feed.js             # Feed loader, post creation, like toggle
│       ├── profile.js          # Profile loader, follow toggle, edit profile
│       └── post.js             # Single post view & comment management
├── server/                     # Express Backend
│   ├── config/
│   │   └── db.js               # MongoDB connection helper with in-memory fallback
│   ├── models/
│   │   ├── User.js             # Mongoose User model & bcrypt hashing
│   │   ├── Post.js             # Mongoose Post model
│   │   └── Comment.js          # Mongoose Comment model
│   ├── middleware/
│   │   └── auth.js             # JWT bearer verification middleware
│   ├── routes/
│   │   ├── auth.js             # Signup, login, and current user routes
│   │   ├── users.js            # Profile, follow/unfollow, followers lists
│   │   ├── posts.js            # Feed, create, single post, like, delete
│   │   └── comments.js         # Add and delete comments
│   ├── .env                    # Environment variables configuration
│   ├── .env.example            # Sample configuration template
│   ├── package.json            # Backend dependencies and scripts
│   ├── seed.js                 # Dummy data seeder
│   ├── server.js               # Express app entry point & static server
│   └── test-api.js             # Automated API integration test suite
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- *(Optional)* Local **MongoDB** server or **MongoDB Atlas** connection URI. If local MongoDB is not running, the server will automatically use an in-memory database instance!

---

### 2. Backend Setup

1. Open terminal and navigate into the `server` directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   A default `.env` file is included. You can customize it or copy from `.env.example`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/mini-social-app
   JWT_SECRET=supersecret_minisocial_jwt_secret_key_2026_!#
   ```

4. Seed the database with demo users & posts:
   ```bash
   npm run seed
   ```

5. Start the backend server:
   ```bash
   npm start
   ```
   The server will start at: **`http://localhost:5000`**

---

### 3. Running the Frontend

You have two simple options to open and use the frontend:

#### Option A: Direct from Express Server (Easiest)
Because the Express backend serves `/client` statically, simply open your browser and go to:
👉 **`http://localhost:5000`**

#### Option B: Using VS Code Live Server or any static web server
You can also open the `client` directory using Live Server (e.g. `http://127.0.0.1:5500/client/index.html`). The frontend `api.js` automatically handles cross-origin requests to `http://localhost:5000/api`.

---

## 👥 Demo User Accounts

All demo accounts have the password: **`password123`**

| Name | Username | Email |
| :--- | :--- | :--- |
| Alex Developer | `@alex_tech` | `alex@example.com` |
| Sarah Traveler | `@sarah_travels` | `sarah@example.com` |
| Rahul Coder | `@dev_rahul` | `rahul@example.com` |
| Maya Designer | `@maya_art` | `maya@example.com` |

---

## 📡 API Endpoints

### Auth Routes
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register new user | No |
| `POST` | `/api/auth/login` | Login user & get JWT token | No |
| `GET` | `/api/auth/me` | Get logged-in user profile | **Yes** |

### User / Profile Routes
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/:id` | Get user profile & their posts | Optional |
| `PUT` | `/api/users/:id` | Update bio & profile picture | **Yes** (Own profile) |
| `POST` | `/api/users/:id/follow` | Toggle follow / unfollow | **Yes** |
| `GET` | `/api/users/:id/followers` | Get user's followers list | No |
| `GET` | `/api/users/:id/following` | Get user's following list | No |

### Post Routes
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/posts` | Create new post | **Yes** |
| `GET` | `/api/posts` | Get all feed posts (newest first) | Optional |
| `GET` | `/api/posts/:id` | Get single post with populated comments | Optional |
| `DELETE` | `/api/posts/:id` | Delete own post and its comments | **Yes** (Own post) |
| `POST` | `/api/posts/:id/like` | Toggle like / unlike on post | **Yes** |

### Comment Routes
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/posts/:id/comments` | Add comment to post | **Yes** |
| `DELETE` | `/api/comments/:id` | Delete own comment | **Yes** (Own comment) |

---

## 🧪 Running Automated Tests

To run the complete automated test suite covering all 23 API flows:
```bash
cd server
npm run test:api
```
All tests verify status codes (`200`, `201`, `400`, `401`, `403`, `404`), error messages, authentication, cascades, and data integrity.
