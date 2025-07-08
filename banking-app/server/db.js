import mysql from 'mysql2'

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'bankingApp',
    password:'Signature@1'
  });

  connection.query(
    'SHOW TABLES',
    (err, result) =>{
      console.log(result); // results contains rows returned by server
    }
  );

  connection.end();
