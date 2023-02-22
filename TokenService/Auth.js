const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null)
    return res.status(401).json({ message: "authorization missing" });
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, trainer) => {
    if (err) return res.status(403);
    req.trainer = trainer;
    next();
  });
}

function decodeToken(req, res){
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null)
    return res.status(401).json({ message: "authorization missing" });
  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, trainer) => {
    if (err) return res.status(403);
    req.trainer = trainer;
  });
  return decoded
}
module.exports.authenticateToken = authenticateToken;
module.exports.decodeToken = decodeToken
