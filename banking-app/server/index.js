import express from 'express'
const app = express()
const port = 8080;

/* rudra shift this whole commented part to another file like db.js */

// import mysql from 'mysql2'

// const connection = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     database: 'bankingApp',
//     password:'Signature@1'
//   });

//   connection.query(
//     'SHOW TABLES',
//     (err, result) =>{
//       console.log(result); // results contains rows returned by server
//     }
//   );


app.listen(port);
