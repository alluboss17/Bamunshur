# Bamunshur Model Town Housing Society

Minimal Vite + React scaffold for a website aimed at housing developers.

Quick start

1. Install dependencies:

```bash
npm install
```

2. Run dev server:

```bash
npm run dev
```

3. Open http://localhost:5173

Run backend server

1. Start the Express JSON API:

```bash
npm run server
```

The API will listen on `http://localhost:3001` with endpoints:
- `GET /api/projects` — list projects
- `POST /api/leads` — submit a contact lead

Admin interface

The app includes a simple admin UI reachable from the navigation: open the `Admin` page to create, edit, and delete projects. There is no authentication in this scaffold — add auth before using in production.

Authentication

This update adds a simple JWT-based login for the admin UI. A default admin user is seeded on first run:

- username: `admin`
- password: `admin123`

Start the server and login from the `Admin` page. The server signs tokens with the `JWT_SECRET` environment variable (defaults to a development value). Change it in production.

Image uploads

Admin users can upload images for projects from the `Admin` page. Uploaded files are stored in `server/uploads` and served at `/uploads/<filename>`. When you create or edit a project you can attach an image; the Projects page will show the first image as a thumbnail.

Image deletion

Admins can delete uploaded images from the `Admin` page. Deleting an image removes it from the project record and attempts to remove the file from `server/uploads`.

Soft-delete and undo

Image deletions are now soft: when an admin deletes an image it is moved to `server/uploads/trash` and marked `deleted` in the DB. Admins can undo deletions from the `Admin` page to restore the image. Server-side validation limits uploads to 5MB and only image MIME types; uploaded images are resized/optimized using `sharp`.

What is included

- Simple client-side routing (state-based) with `Home`, `Projects`, and `Contact` pages
- `Navbar` component and basic CSS in `src/styles.css`

Next steps (suggestions)

- Add a backend API for storing projects and leads (Express, Firebase, or Supabase)
- Add authentication for developer/admin accounts
- Replace client-side routing with a router (React Router or Next.js)

