require('dotenv').config();

const mongoose = require('mongoose');
const Address = require('../models/Address');

async function seedAddresses() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        await Address.deleteMany({});

        await Address.insertMany([
            { street: 'Mickiewicza', buildingNumber: '12', postalCode: '30-001', city: 'Kraków' },
            { street: 'Kościuszki', buildingNumber: '5', postalCode: '31-100', city: 'Kraków' },
            { street: 'Piłsudskiego', buildingNumber: '21', postalCode: '31-110', city: 'Kraków' },
            { street: 'Długa', buildingNumber: '8', postalCode: '31-146', city: 'Kraków' },
            { street: 'Karmelicka', buildingNumber: '15', postalCode: '31-133', city: 'Kraków' },

            { street: 'Lipowa', buildingNumber: '3', postalCode: '00-001', city: 'Warszawa' },
            { street: 'Puławska', buildingNumber: '44', postalCode: '02-512', city: 'Warszawa' },
            { street: 'Marszałkowska', buildingNumber: '10', postalCode: '00-590', city: 'Warszawa' },
            { street: 'Grójecka', buildingNumber: '78', postalCode: '02-094', city: 'Warszawa' },
            { street: 'Targowa', buildingNumber: '25', postalCode: '03-728', city: 'Warszawa' },

            { street: 'Świdnicka', buildingNumber: '6', postalCode: '50-066', city: 'Wrocław' },
            { street: 'Legnicka', buildingNumber: '55', postalCode: '54-203', city: 'Wrocław' },
            { street: 'Piastowska', buildingNumber: '12', postalCode: '50-361', city: 'Wrocław' },
            { street: 'Hallera', buildingNumber: '90', postalCode: '53-325', city: 'Wrocław' },

            { street: 'Gdańska', buildingNumber: '18', postalCode: '90-706', city: 'Łódź' },
            { street: 'Piotrkowska', buildingNumber: '120', postalCode: '90-006', city: 'Łódź' },
            { street: 'Zgierska', buildingNumber: '50', postalCode: '91-059', city: 'Łódź' },

            { street: 'Grunwaldzka', buildingNumber: '33', postalCode: '80-241', city: 'Gdańsk' },
            { street: 'Długa', buildingNumber: '22', postalCode: '80-831', city: 'Gdańsk' },

            { street: 'Hetmańska', buildingNumber: '7', postalCode: '35-045', city: 'Rzeszów' }
        ]);

        console.log('Dodano przykładowe adresy');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedAddresses();