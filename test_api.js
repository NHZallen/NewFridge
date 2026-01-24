import https from 'https';

const options = {
    hostname: 'api.apilayer.com',
    path: '/spoonacular/recipes/complexSearch?includeIngredients=apples&fillIngredients=true&number=1',
    method: 'GET',
    headers: {
        'apikey': 'rmgY2DQ9HprVQxD2YuBFGTmvneOUrJRz'
    }
};

const req = https.request(options, (res) => {
    console.log('statusCode:', res.statusCode);

    let data = '';
    res.on('data', (d) => {
        data += d;
    });

    res.on('end', () => {
        console.log('Body:', data);
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
