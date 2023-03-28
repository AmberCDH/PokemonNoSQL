const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null)
    return res.status(401).json({ message: "authorization missing" });
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, trainer) => {
    if (err) return new Error(res.status(403).json({message:"USER_ERROR"}))
    req.trainer = trainer;
    next();
  });
}

function decodeToken(token){
  var result = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  if(result.err) return null;
  else return result.id
}
module.exports.authenticateToken = authenticateToken;
module.exports.decodeToken = decodeToken
