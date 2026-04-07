require('dotenv').config();
console.log('ENV URI:', process.env.MONGODB_URI);

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});