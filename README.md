# 🌐 ConnectSphere: A Full-Stack Mini Social Media Platform

ConnectSphere is a full-stack social networking web application designed with the sleek, modern aesthetic and interactive responsiveness of platforms like Instagram and Threads. It enables users to connect, share photo-driven posts with custom filters, publish 24-hour stories, like and comment with real-time feedback, follow inspiring creators, and customize their profiles.

Built using **HTML5, Vanilla CSS3, JavaScript (ES6+)** for the frontend, **Node.js with Express.js** for the backend, **MongoDB with Mongoose** for database persistence, **JWT** for secure stateless authentication, and **bcryptjs** for robust password hashing.

---

## 📸 Key Features & User Experience

### 1. 🎨 Modern Instagram / Threads Caliber UI
- **Rich Design System**: Curated color palette, dark mode (default) and light mode toggle with smooth transitions.
- **Glassmorphism & Depth**: Subtle glass overlays, soft glow accents, and responsive layout across desktop, tablet, and mobile.
- **Micro-Animations**: 
  - **Double-Tap Heart Explosion**: Double-clicking any post image triggers a pulsating neon heart burst with floating animation.
  - **Animated Story Rings**: Gradient rings surrounding creator avatars indicating active 24-hour stories.
  - **Bouncing Action Buttons**: Tactile spring effects when liking, commenting, or bookmarking.

### 2. 📖 24-Hour Stories Bar & Fullscreen Viewer
- Stories carousel positioned prominently at the top of the feed.
- **+ Your Story**: Quick creation modal to publish visual stories with captions.
- **Interactive Story Viewer**: Fullscreen dark view with timed multi-segment progress bars, tap navigation (tap left for previous, tap right for next), and author info.

### 3. ✍️ Create & Customize Posts
- **Drag-and-Drop Image Uploader**: Direct image upload or paste any image URL.
- **Live Visual Filters**: Preset CSS filters including *Normal, Clarendon, Vintage, Black & White, Warm Glow, Cool Synth, and Cyberpunk*.
- **Rich Caption & Tagging**: Automatic detection and clickable rendering of `#hashtags` and `@mentions`.
- **Location Tagging**: Add your city, venue, or studio.

### 4. 💬 Engagement & Social Interactions
- **Like / Unlike**: Real-time counter and social proof ("Liked by alex and 14 others").
- **Comments Section**: Expandable comments accordion with instant inline posting and owner delete controls.
- **Save to Collection**: Bookmark favorite posts into a private "Saved" collection.
- **Share Link**: One-click clipboard copy with floating toast alert.

### 5. 👤 Profile & Relationship Management
- **User Profile Page**: Large avatar, bio, website link, location badge, and stats (Posts, Followers, Following count).
- **Tabs**: 
  - 📸 *Posts*: 3-column grid with hover overlay showing likes and comment counts.
  - 🔖 *Saved*: Collection of all bookmarked posts (accessible by profile owner).
- **Follow / Unfollow**: One-click follow system with dynamic follower count updates.
- **Suggested Creators**: Widget recommending creators you don't follow yet.

### 6. 🔍 Live Search & Dynamic Trending Hashtags
- **Real-Time Creator Search**: Instant debounced search for finding users and exploring profiles.
- **Dynamic Trending Topics**: Popular hashtags aggregated directly from real posts in MongoDB that filter the feed with a single click.

---

## 🛠️ Technology Stack Breakdown

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | HTML5 | Semantic structure and accessible layout |
| **Frontend** | CSS3 (Vanilla) | Modern glassmorphism, responsive grid/flexbox, CSS variables, dark/light themes |
| **Frontend** | JavaScript (ES6+) | Modular client-side architecture, dynamic DOM rendering, state management, REST API integration |
| **Backend** | Node.js | Fast, asynchronous server runtime environment |
| **Backend** | Express.js | RESTful API routing, middleware pipeline, static asset serving |
| **Database** | MongoDB | Document database for users, posts, comments, stories, and notifications |
| **Database ODM**| Mongoose | Schema definitions, validation, virtuals, population, and hooks |
| **Authentication**| JSON Web Tokens (JWT) | Secure bearer token issuance and verification |
| **Security** | bcryptjs | One-way salt hashing for user passwords |
| **File Handling**| Multer | Multipart/form-data image uploads with disk storage |

---

## 📁 Project Architecture & Directory Structure

```text
Social Media - Mini/
├── server/
│   ├── config/
│   │   └── db.js                 # Smart DB connection (MongoDB URI + in-memory fallback)
│   ├── controllers/
│   │   ├── auth.controller.js    # Register, login, getMe, updateProfile
│   │   ├── post.controller.js    # Post CRUD, toggleLike, addComment, deleteComment, save
│   │   ├── user.controller.js    # Profile view, follow/unfollow, suggestions, search
│   │   ├── story.controller.js   # Story retrieval and publishing
│   │   └── notification.controller.js # Notifications fetch and mark read
│   ├── middleware/
│   │   ├── auth.js               # JWT verification (protect) and optionalAuth
│   │   └── upload.js             # Multer image storage setup
│   ├── models/
│   │   ├── User.js               # User schema with bcrypt pre-save and methods
│   │   ├── Post.js               # Post schema with comments subdocuments & tags
│   │   ├── Story.js              # 24-hr story schema with TTL index
│   │   └── Notification.js       # Notification schema
│   ├── routes/
│   │   ├── auth.routes.js        # /api/auth routes
│   │   ├── post.routes.js        # /api/posts routes
│   │   ├── user.routes.js        # /api/users routes
│   │   ├── story.routes.js       # /api/stories routes
│   │   └── notification.routes.js# /api/notifications routes
│   └── server.js                 # Express app initialization, static serving, SPA fallback
├── public/
│   ├── index.html                # Main SPA semantic template with modals & nav
│   ├── css/
│   │   ├── variables.css         # Theme tokens, gradients, color palettes
│   │   ├── base.css              # Reset, typography, animations, buttons, badges
│   │   ├── layout.css            # 3-column desktop layout & mobile bottom/top bars
│   │   └── components.css        # Stories, post cards, composer, widgets, modals, toasts
│   ├── js/
│   │   ├── api.js                # Client API service with JWT header injection
│   │   ├── state.js              # Client state store & pub/sub events
│   │   ├── ui.js                 # Toast engine, time formatters, modal controllers
│   │   ├── auth.js               # Login, register, demo accounts quick-fill
│   │   ├── posts.js              # Feed rendering, double-tap heart, comments, post creator
│   │   ├── stories.js            # Stories carousel, viewer progress timer
│   │   ├── profile.js            # Profile page, 3-column posts grid, edit profile
│   │   └── app.js                # Main coordinator, theme switcher, search, routing
│   └── uploads/                  # Uploaded post and story media
├── .env                          # Environment variables configuration
├── .env.example                  # Environment template
├── package.json                  # Dependencies and execution scripts
├── test_suite.js                 # 16-point automated end-to-end test suite
└── README.md                     # Comprehensive documentation
```

---

## 🔌 REST API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user account with hashed password |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive JWT bearer token |
| `GET` | `/api/auth/me` | Private | Get authenticated user profile and stats |
| `PUT` | `/api/auth/update-profile` | Private | Update display name, avatar, bio, website, location |

### Posts (`/api/posts`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/posts` | Public/Opt | Get posts feed with pagination, tag, and following filters |
| `POST` | `/api/posts` | Private | Create new post (supports image upload or media URL) |
| `GET` | `/api/posts/:id` | Public/Opt | Get single post details with comments |
| `DELETE`| `/api/posts/:id` | Private | Delete post (author only) |
| `PUT` | `/api/posts/:id/like` | Private | Toggle like / unlike on post |
| `POST` | `/api/posts/:id/comment` | Private | Add comment to post |
| `DELETE`| `/api/posts/:id/comment/:commentId` | Private | Delete comment (comment author or post owner) |
| `PUT` | `/api/posts/:id/save` | Private | Bookmark / save post to user collection |

### Users (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users/profile/:username` | Public/Opt | View creator profile, follow status, and posts |
| `PUT` | `/api/users/:id/follow` | Private | Toggle follow / unfollow creator |
| `GET` | `/api/users/suggestions` | Public/Opt | Get recommended accounts to follow |
| `GET` | `/api/users/search?q=...` | Public | Live search users by name or username |
| `GET` | `/api/users/saved-posts` | Private | Retrieve all bookmarked posts for current user |

### Stories & Notifications (`/api/stories` & `/api/notifications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/stories` | Public | Get active 24-hour stories grouped by user |
| `POST` | `/api/stories` | Private | Publish new story with image and optional caption |
| `GET` | `/api/notifications` | Private | Get user notifications (likes, comments, follows) |
| `PUT` | `/api/notifications/mark-read`| Private | Mark all unread notifications as read |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.0 or newer recommended)
- **MongoDB** (Optional: If local MongoDB is running, it connects automatically. If not, the application automatically launches an in-memory MongoDB instance with zero manual setup!)

### 2. Installation
Clone or navigate to the project directory and install dependencies:
```bash
npm install
```

### 3. Environment Configuration
The project includes a ready-to-use `.env` file. You can customize it or copy from `.env.example`:
```ini
PORT=5000
MONGODB_URI=mongodb://localhost:27017/connectsphere
JWT_SECRET=connectsphere_jwt_super_secret_key_8844d779
NODE_ENV=development
```

### 4. Running the Application
Start the server:
```bash
npm start
```
The server will start at:
- **Web Application URL**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 5. Running the Automated Test Suite
To execute the automated end-to-end test suite verifying all 16 endpoints and workflows:
```bash
node test_suite.js
```
Expected output:
```text
🧪 Starting ConnectSphere Full-Stack Automated Test Suite...
  ✅ [PASS] Server health check (/api/health)
  ✅ [PASS] Login seeded user Alex Rivera (/api/auth/login)
  ✅ [PASS] Register new user (/api/auth/register)
  ...
🎉 Test Suite Completed: 16 of 16 tests passed!
```

---

## 👤 Creating Your Account

ConnectSphere starts with a clean database. You can:
1. Click **"Sign In"** -> **"Sign Up"** in the web app to create your personal creator account.
2. Publish posts, upload photos, add `#hashtags`, follow other members, and customize your profile in real-time.
3. *(Optional)* If you ever want to populate sample data for demonstration, set `SEED_DATA=true` in your `.env` file before starting the server.
