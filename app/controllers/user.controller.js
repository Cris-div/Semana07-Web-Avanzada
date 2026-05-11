export const allAccess = (req, res) => {
  res.send("Public Content.");
};


export const userBoard = (req, res) => {
  res.send("User Content.");
};


export const adminBoard = (req, res) => {
  res.send("Admin Content.");
};
