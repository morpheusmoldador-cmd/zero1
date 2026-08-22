const fs = require("fs");
const path = require("path");
const session = require("express-session");

class FileSessionStore extends session.Store {
  constructor(dir) {
    super();
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
  }

  fileOf(sid) {
    const safe = String(sid || "").replace(/[^a-zA-Z0-9._-]/g, "");
    return path.join(this.dir, `${safe}.json`);
  }

  get(sid, cb) {
    fs.readFile(this.fileOf(sid), "utf8", (err, data) => {
      if (err) return cb(null, null);
      try {
        cb(null, JSON.parse(data));
      } catch {
        cb(null, null);
      }
    });
  }

  set(sid, sess, cb) {
    fs.writeFile(this.fileOf(sid), JSON.stringify(sess), "utf8", (err) => cb(err));
  }

  destroy(sid, cb) {
    fs.unlink(this.fileOf(sid), (err) => {
      if (err && err.code !== "ENOENT") return cb(err);
      cb(null);
    });
  }
}

module.exports = { FileSessionStore };
