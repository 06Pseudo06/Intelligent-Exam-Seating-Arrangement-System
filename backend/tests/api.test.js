const { describe, it, after } = require("node:test");
const assert = require("node:assert");
const app = require("../server");
const db = require("../src/config/db");

// Lightweight HTTP requester for Express app tests without external heavy libraries
const request = (appInstance) => {
    const http = require("http");
    const server = http.createServer(appInstance);

    return {
        get: (pathUrl) => {
            return new Promise((resolve, reject) => {
                server.listen(0, () => {
                    const port = server.address().port;
                    const req = http.request(
                        {
                            hostname: "127.0.0.1",
                            port,
                            path: pathUrl,
                            method: "GET"
                        },
                        (res) => {
                            let body = "";
                            res.on("data", (chunk) => (body += chunk));
                            res.on("end", () => {
                                server.close(() => {
                                    try {
                                        resolve({
                                            status: res.statusCode,
                                            headers: res.headers,
                                            body: JSON.parse(body)
                                        });
                                    } catch (e) {
                                        resolve({
                                            status: res.statusCode,
                                            headers: res.headers,
                                            body
                                        });
                                    }
                                });
                            });
                        }
                    );
                    req.on("error", (err) => {
                        server.close(() => reject(err));
                    });
                    req.end();
                });
            });
        },
        post: (pathUrl, data) => {
            return new Promise((resolve, reject) => {
                server.listen(0, () => {
                    const port = server.address().port;
                    const postData = JSON.stringify(data || {});
                    const req = http.request(
                        {
                            hostname: "127.0.0.1",
                            port,
                            path: pathUrl,
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Content-Length": Buffer.byteLength(postData)
                            }
                        },
                        (res) => {
                            let body = "";
                            res.on("data", (chunk) => (body += chunk));
                            res.on("end", () => {
                                server.close(() => {
                                    try {
                                        resolve({
                                            status: res.statusCode,
                                            headers: res.headers,
                                            body: JSON.parse(body)
                                        });
                                    } catch (e) {
                                        resolve({
                                            status: res.statusCode,
                                            headers: res.headers,
                                            body
                                        });
                                    }
                                });
                            });
                        }
                    );
                    req.on("error", (err) => {
                        server.close(() => reject(err));
                    });
                    req.write(postData);
                    req.end();
                });
            });
        }
    };
};

describe("Backend API Unit & Validation Tests", () => {
    const client = request(app);

    it("GET / should return root API health metadata", async () => {
        const res = await client.get("/");
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "active");
        assert.ok(res.body.name.includes("Intelligent Exam Seating"));
    });

    it("POST /api/seating/generate should validate missing examId parameter", async () => {
        const res = await client.post("/api/seating/generate", {});
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.strictEqual(res.body.message, "examId is required.");
    });

    it("POST /api/students should reject payload missing required fields", async () => {
        const res = await client.post("/api/students", {
            first_name: "TestStudent"
            // Missing roll_no and department_id
        });
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.message, "Required fields missing");
    });

    it("POST /api/registrations/bulk should reject payload missing student_ids array", async () => {
        const res = await client.post("/api/registrations/bulk", {
            exam_id: 1,
            student_ids: []
        });
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.ok(res.body.message.includes("non-empty student_ids array"));
    });

    it("GET /api/nonexistent-route should return 404 with clean JSON error", async () => {
        const res = await client.get("/api/nonexistent-route");
        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.body.success, false);
        assert.ok(res.body.message.includes("not found"));
    });

    after(async () => {
        await new Promise((resolve) => db.end(resolve));
    });
});
