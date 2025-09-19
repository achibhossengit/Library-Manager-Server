# 📚 Zen Library – Server Side (Library-Manager-Server)

This is the backend API for the Zen Library project, a full-featured library management system built with Node.js, Express, MongoDB, and Firebase Admin SDK. It handles book data, user authentication, borrowing logic, and secure route protection.

---

## 🌐 Live Server

🔗 [Live API Endpoint](https://library-manager-server-achibhossengit-achib-hossens-projects.vercel.app)  
🔗 [Client Repo](https://github.com/achibhossengit/Library-Manager-Client)

---

## 🧠 Project Purpose

To provide a secure and scalable backend for managing:

- Book CRUD operations
- Borrowing and returning books
- User authentication and authorization
- Popular book tracking
- Protected routes using Firebase token verification

---

## 🛠️ Technologies Used

- **Node.js** + **Express.js**
- **MongoDB Atlas**
- **Firebase Admin**
- **CORS**
---

## 📦 API Features

### 🔹 Book Management

- `GET /books` – Fetch all books
- `GET /books/popular` – Fetch books sorted by borrow count
- `GET /books/:id` – Fetch single book details
- `POST /books` – Add a new book (protected)
- `PUT /books/:id` – Update book details (protected)
- `DELETE /books/:id` – Delete a book (protected)

### 🔹 Borrowing Logic

- `POST /borrow` – Borrow a book (protected)
- `GET /borrowed` – Get borrowed books for a user
- `PUT /return/:id` – Return a borrowed book

### 🔹 Security

- Firebase token verification middleware
- Email-based access control
- CORS enabled for frontend communication

---

## 📄 How to Run Locally

### 🔹 Clone the Repo

```bash
git clone https://github.com/achibhossengit/Library-Manager-Server
cd Library-Manager-Server
