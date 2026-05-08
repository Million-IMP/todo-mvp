# Todo App

A lightweight, personal task management web application built with React and Vite. It is designed to help organize daily work with priorities, deadlines, and smart reminders without complexity.

## 🚀 Features

- **Core Task Management**: Create, view, edit, and delete tasks quickly.
- **Categorization & Tagging**: Organize tasks by categories, tags, and custom labels.
- **Priority & Deadlines**: Set task priority (High, Medium, Low) and specific deadlines to never miss a task.
- **Alerts & Reminders**: Get browser-based notifications for approaching or overdue deadlines.
- **Snooze Functionality**: Easily snooze notifications for 5m, 15m, 30m, or 1 hour.
- **Data Persistence**: All tasks and data are safely stored locally in your browser (`localStorage`) as JSON. No backend or login required!
- **Responsive UI**: Beautifully styled with Tailwind CSS, ensuring a seamless experience across mobile and desktop.

## 🛠️ Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **Testing**: Vitest, Playwright (E2E), React Testing Library

## 📦 Installation & Running

1. Move to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the local server address (usually `http://localhost:5173`).

## 🧪 Testing

- Run unit tests: `npm run test`
- Run tests with UI: `npm run test:ui`
- Run End-to-End tests: `npm run test:e2e`

## 📁 Project Structure

- `frontend/`: The main React application.
  - `src/`: Core source code including components, contexts, custom hooks, and utilities.
  - `tests/`: End-to-End Playwright test specifications.
- `docs/`: Project documentation, containing architectural planning and design records.
