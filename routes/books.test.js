process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../app");
const db = require('../db');

let testBookArray;

beforeEach(async () => {
  const result = await db.query(
    `INSERT INTO books (isbn, amazon_url, author, language,
                        pages, publisher, title, year)
      VALUES ('9781484249666',
              'https://a.co/d/5MYO6uT',
              'Francesco Strazzullo',
              'English',
              265,
              'Apress',
              'Frameworkless Front-End Development',
              2019)
      RETURNING isbn, amazon_url, author, language,
                pages, publisher, title, year`
    );
  testBookArray = result.rows;
})

afterEach(async () => {
  await db.query(`DELETE FROM books`);
})

afterAll(async () => {
  await db.end();
})

describe("GET /books", () => {
  test("Getting a list of books", async () => {
    const res = await request(app).get('/books');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({books: testBookArray});
  })
})

describe("POST /books", () => {
  test("Adding a book to the database with correct data", async () => {
    const newBook = {
      isbn: "9781803234502",
      amazon_url: "https://a.co/d/4xhy6Hv",
      author: "Maximilian Schwarzmuller",
      language: "English",
      pages: 590,
      publisher: "Packt Publishing",
      title: "React Key Concepts",
      year: 2022
    };

    // Test that post is successful and that response is correct
    const routeRes = await request(app).post('/books').send(newBook);
    expect(routeRes.statusCode).toBe(201);
    expect(routeRes.body).toEqual({book: newBook});

    // Test that additional book is added to database
    const queryRes = await db.query(
      `SELECT isbn FROM books`
    )
    expect(queryRes.rows.length).toBe(testBookArray.length + 1);
  })

  test("Adding a book to the database with incorrect data", async () => {
    const newBook = {
      isbn: "9781803234502",
      amazon_url: "https://a.co/d/4xhy6Hv",
      author: "Maximilian Schwarzmuller",
      language: "English",
      pages: "Too many",
      publisher: "Packt Publishing",
      title: "React Key Concepts",
      year: 2022
    };

    // Test that post creates error
    const routeRes = await request(app).post('/books').send(newBook);
    expect(routeRes.statusCode).toBe(400);
    expect(routeRes.body).toEqual({
      error: {message: expect.any(Array), status: 400},
      message: expect.any(Array)}
    );

    // Test that erroneous book is not added to database
    const queryRes = await db.query(
      `SELECT isbn FROM books`
    )
    expect(queryRes.rows.length).toBe(testBookArray.length);
  });
});

describe("GET /books/:isbn", () => {
  test("Getting a book by isbn", async () => {
    const res = await request(app).get('/books/9781484249666');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({book: testBookArray[0]});
  });

  test("Getting a book by isbn with incorrect isbn", async () => {
    const res = await request(app).get('/books/978148424966');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      error: {message: expect.any(String), status: 404},
      message: expect.any(String)}
    );
  });
});

describe("PUT /books/:isbn", () => {
  test("Editing a book in the database with correct data", async () => {
    const editedBook = {
      isbn: "9781484249666",
      amazon_url: "https://a.co/d/5MYO6uT",
      author: "Francesco Strazzullo",
      language: "English",
      pages: 265,
      publisher: "Apress",
      title: "Frameworkless Front-End Development",
      year: 2019
    };

    // Test that post is successful and that response is correct
    const routeRes = await request(app).put('/books/9781484249666').send(editedBook);
    expect(routeRes.statusCode).toBe(200);
    expect(routeRes.body).toEqual({book: editedBook});

    // Test that no additional book is added to the database
    const queryRes = await db.query(
      `SELECT isbn FROM books`
    )
    expect(queryRes.rows.length).toBe(testBookArray.length);
  })

  test("Editing a book in the database with incorrect data", async () => {
    const editedBook = {
      isbn: "9781484249666",
      amazon_url: "https://a.co/d/5MYO6uT",
      author: 54,
      language: "English",
      pages: 265,
      publisher: "Apress",
      title: "Frameworkless Front-End Development",
      year: 2019
    };

    // Test that put request creates error
    const routeRes = await request(app).post('/books').send(editedBook);
    expect(routeRes.statusCode).toBe(400);
    expect(routeRes.body).toEqual({
      error: {message: expect.any(Array), status: 400},
      message: expect.any(Array)}
    );
  });
});

describe("DELETE /books/:isbn", () => {
  test("Deleting a book from the database", async () => {
    // Test that response is correct
    const res = await request(app).delete('/books/9781484249666');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({message: "Book deleted"});

    // Test that book is deleted from the database
    const queryRes = await db.query(
      `SELECT isbn FROM books`
    )
    expect(queryRes.rows.length).toBe(testBookArray.length - 1);
  })

  test("Deleting a book from the database with incorrect ISBN", async () => {
    // Test that response is correct
    const res = await request(app).delete('/books/978864249666');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      error: {message: expect.any(String), status: 404},
      message: expect.any(String)}
    );

    // Test that no book is deleted from the database
    const queryRes = await db.query(
      `SELECT isbn FROM books`
    )
    expect(queryRes.rows.length).toBe(testBookArray.length);
  })
});