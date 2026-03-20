# AI-Fashion Searching

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Qdrant-f90052?style=for-the-badge&logo=qdrant&logoColor=white" alt="Qdrant" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</div>
<br/>

**AI-Fashion Searching** (formerly ThreadMatch) is a modern, AI-powered visual search engine for clothing and fashion. By leveraging state-of-the-art multimodal embeddings (OpenAI CLIP) and extremely fast vector search (Qdrant), users can upload any clothing photo or use natural language to instantly find visually similar fashion pieces.

## ✨ Key Features

- **Visual Image Search**: Upload any fashion item image and find visually identical or highly similar matches in the catalog.
- **Semantic Text Search**: Perform descriptive natural language queries (e.g., "blue floral summer dress") instead of relying on exact keyword matches.
- **Lightning-Fast Vector Search**: Powered by Hierarchical Navigable Small World (HNSW) graphs via Qdrant for ~150-280ms search latency over large datasets.
- **Modern UI/UX**: Fully responsive Next.js frontend built with Tailwind CSS, featuring drag-and-drop uploads, skeleton loaders, and a sleek layout.
- **User Authentication**: Built-in login and sign-up pages to seamlessly onboard users.
- **Cloud Assets**: Integrated image storage and edge CDN delivery capabilities via Cloudinary.

---

## 🏗 Tech Stack

### Frontend Components
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Icons & UI**: Lucide-React, `clsx`, `tailwind-merge`
- **File Uploads**: `react-dropzone`
- **Deployment Strategy**: Vercel

### Backend & ML Components
- **Framework**: FastAPI (Python)
- **Machine Learning Model**: OpenAI CLIP (ViT-B/32) via `open-clip-torch`
- **Vector Database**: Qdrant Cloud (HNSW indexing)
- **Image Hosting**: Cloudinary
- **Original Dataset**: `ashraq/fashion-product-images-small` (Hugging Face)
- **Deployment Strategy**: Railway / Docker

---

## 📁 Project Structure

```text
fashion-search/
├── backend/                  # FastAPI Application
│   ├── main.py               # Application entry point & API routes
│   ├── config.py             # Environment & pydantic settings
│   ├── routers/              # Endpoint modules (search, analytics, etc.)
│   ├── services/             # Core business logic (Qdrant & CLIP integrations)
│   ├── Dockerfile            # Containerization configuration
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # Next.js Application
│   ├── app/                  # Next Router pages (Home, Login, Signup, features)
│   ├── components/           # Reusable React UI (Navbar, ImageUpload, Results)
│   ├── public/               # Static assets
│   ├── tailwind.config.js    # Styling configuration
│   └── package.json          # Node dependencies
│
└── pipeline/                 # Data Ingestion Toolkit
    ├── ingest.py             # Pre-processes images, extracts embeddings, populates Qdrant
    └── requirements.txt      # Pipeline specific dependencies
```

---

## 🚀 Getting Started

Follow these steps to run the complete stack locally.

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.9+)
- **Qdrant Cloud Account** (Free tier covers 1GB)
- **Cloudinary Account** (Free tier)

### 2. Environment Configuration
Clone the repository and set up your environment variables:
```bash
git clone https://github.com/your-username/fashion-search.git
cd fashion-search

# Copy the example backend env file (if available) or create one
cp .env.example .env
```

Inside `.env`, ensure the following are populated:
```ini
QDRANT_URL=your_qdrant_cluster_url
QDRANT_API_KEY=your_qdrant_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 3. Populating the Vector Database
Before searching, you must ingest the fashion dataset into your Qdrant cluster.
```bash
cd pipeline
pip install -r requirements.txt

# Option A: Quick Test (500 items, bypass Cloudinary uploads)
python ingest.py --limit 500 --skip-cloudinary

# Option B: Full Ingestion (44k+ items - takes time depending on CPU)
python ingest.py
```

### 4. Running the Backend
Return to the project root and launch the FastAPI server.
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or `.venv\Scripts\activate` on Windows
pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```
The backend will be available at `http://localhost:8000`. You can visit `http://localhost:8000/docs` to see the interactive Swagger UI.

### 5. Running the Frontend
In a new terminal, launch the Next.js development server.
```bash
cd frontend
npm install

# Connect frontend to local backend
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application!

---

## 🔌 Core API Endpoints

The backend exposes several critical endpoints for the search experience:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/search/image` | Accepts a multipart image file. Returns visually similar items. |
| `POST` | `/search/text` | Accepts a text query ("red dress"). Returns semantic matches. |
| `GET`  | `/product/{id}` | Fetches detailed metadata for a specific item. |
| `POST` | `/search/feedback`| Records user click-throughs for future model fine-tuning. |
| `GET`  | `/search/health` | Service liveness probe and Qdrant connection status. |

---

## 🌐 Deployment Instructions

### Deploying the Backend (Railway)
1. Push your repository to GitHub.
2. Link the repository to [Railway](https://railway.app/).
3. Set the Root Directory to `/backend`. Railway will automatically build using the included `Dockerfile`.
4. Inject your environment variables (`QDRANT_URL`, etc.) in the Railway Dashboard.
5. Generate a public domain URL.

### Deploying the Frontend (Vercel)
1. Import your GitHub repository to [Vercel](https://vercel.com/).
2. Set the Root Directory to `frontend`.
3. Add the environment variable `NEXT_PUBLIC_API_URL` pointing to your new Railway backend URL.
4. Hit **Deploy**.

---

## 🔮 Future Roadmap
- [ ] **Persistent User Accounts**: Link the frontend UI to a database (like Supabase or PostgreSQL) for complete authentication logic.
- [ ] **Saved Collections & Likes**: Allow users to save their favorite fashion finds.
- [ ] **Outfit Recommender (Shop the Look)**: Automatically suggest matching pieces for uploaded items.
- [ ] **Re-ranking Model Training**: Use BPR algorithms fed by the `/search/feedback` endpoint to optimize results based on user preferences.
- [ ] **Mobile App Port**: Migrate the Next.js frontend to React Native for native iOS & Android apps.

---

> **Note**: This application processes image embeddings entirely in-process using OpenAI's CLIP model via PyTorch. You do not need an external OpenAI API key for embedding features, making it highly cost-effective and completely free to run computationally!
