const express = require('express');
const app = express();
const PORT = 3001;
require('dotenv').config();
const appKey = process.env.APP_KEY;
const cookieParser = require('cookie-parser');


app.use(express.static('public'));
app.use(express.json()); //middleware to pull json out of the request
app.use(cookieParser());


app.post('/login', async (req, res) => {
    // #region POST /login
    const clientId = req.body.clientId;
    const clientSecret = req.body.clientSecret;

    const url = "https://auth.servicetitan.io/connect/token";
    const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
    });

    let response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
    });

    let data = await response.json();

    if (!data.access_token) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }


    res.cookie('access_token', data.access_token, {
        httpOnly: true,
        maxAge: data.expires_in * 1000
    });

    res.status(200).json({ message: 'Success' });
    // #endregion
}
);

app.get('/authenticate', (req, res) => {
    // #region GET /authenticate
    const accessToken = req.cookies.access_token;
    if (!accessToken) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    res.json({ message: 'Success' });
    // #endregion
});

app.post('/tags', async (req, res) => {
    // #region POST /tags
    const tenantID = req.body.tenantID;
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    let allTags = []
    let page = 1;
    let hasMore = true;

    try {
        while (hasMore) {
            const fetchPromises = [];
            const batchSize = 5; // Number of pages to fetch concurrently

            // Create an array of promises to fetch a batch of pages concurrently
            for (let i = 0; i < batchSize; i++) {
                const url = `https://api.servicetitan.io/settings/v2/tenant/${tenantID}/tag-types?page=${page + i}`;
                fetchPromises.push(fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': accessToken,
                        'ST-App-Key': appKey
                    }
                }).then(response => {
                    if (response.status === 401) {
                        throw new Error('Unauthorized');
                    }
                    return response.json();
                }));
            }

            // Wait for all fetch promises to resolve
            const results = await Promise.all(fetchPromises);

            // Process the results
            results.forEach(tagsData => {
                allTags = allTags.concat(tagsData.data);
                hasMore = tagsData.hasMore;
            });

            // Increment the page number by the batch size
            page += batchSize;

            // If any of the results indicate there are no more pages, stop the loop
            if (!hasMore) {
                break;
            }
        }
        res.json({ data: allTags });
        //console.log(allTags)
    } catch (error) {
        console.error('Error fetching tags:', error);
        if (error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
        } else {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
    // #endregion
});

app.post('/jobs', async (req, res) => {
    // #region POST /jobs
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const tenantID = req.body.tenantID;
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    let allJobs = [];
    let page = 1;
    let hasMore = true;

    try {
        while (hasMore) {
            const fetchPromises = [];
            const batchSize = 15; // Number of pages to fetch concurrently

            // Create an array of promises to fetch a batch of pages concurrently
            for (let i = 0; i < batchSize; i++) {
                //console.log('Fetching jobs page:', page + i);
                const url = `https://api.servicetitan.io/jpm/v2/tenant/${tenantID}/jobs?jobStatus=Completed&page=${page + i}&completedOnOrAfter=${startDate}&completedBefore=${endDate}`;
                fetchPromises.push(fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': accessToken,
                        'ST-App-Key': appKey
                    }
                }).then(response => {
                    if (response.status === 401) {
                        throw new Error('Unauthorized');
                    }
                    return response.json();
                }));
            }

            // Wait for all fetch promises to resolve
            const results = await Promise.all(fetchPromises);

            // Process the results
            results.forEach(jobsData => {
                allJobs = allJobs.concat(jobsData.data);
                hasMore = jobsData.hasMore;
            });

            // Increment the page number by the batch size
            page += batchSize;

            // If any of the results indicate there are no more pages, stop the loop
            if (!hasMore) {
                break;
            }
        }

        res.json({ data: allJobs });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        if (error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
        } else {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
    // #endregion
});

app.post('/invoices', async (req, res) => {
    // #region POST /invoices
    const invoiceIds = req.body.invoiceIds;
    const tenantID = req.body.tenantID;
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    let allInvoices = [];
    let page = 1;
    let hasMore = true;

    try {
        while (hasMore) {
            const fetchPromises = [];
            const batchSize = 5; // Number of pages to fetch concurrently
            // Create an array of promises to fetch a batch of pages concurrently
            for (let i = 0; i < batchSize; i++) {
                //console.log('Fetching invoices page:', page + i);
                const url = `https://api.servicetitan.io/accounting/v2/tenant/${tenantID}/invoices?ids=${invoiceIds}&page=${page + i}`;
                fetchPromises.push(fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': accessToken,
                        'ST-App-Key': appKey
                    }
                }).then(response => {
                    if (response.status === 401) {
                        throw new Error('Unauthorized');
                    }
                    return response.json();
                }));
            }
            // Wait for all fetch promises to resolve
            const results = await Promise.all(fetchPromises);
            // Process the results
            results.forEach(invoicesData => {
                allInvoices = allInvoices.concat(invoicesData.data);
                hasMore = invoicesData.hasMore;
            });
            // Increment the page number by the batch size
            page += batchSize;
            // If any of the results indicate there are no more pages, stop the loop
            if (!hasMore) {
                break;
            }
        }
        res.json({ data: allInvoices });

    } catch (error) {
        console.error('Error fetching invoices:', error);
        if (error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
        } else {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
    // #endregion
});

app.post('/customers', async (req, res) => {
    // #region POST /customers
    const customerIds = req.body.customerIds;
    const tenantID = req.body.tenantID;
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const uniqueCustomerIds = [...new Set(customerIds)]; // Remove duplicates
    const batchSize = 20;
    let allCustomers = [];

    try {

        for (let i = 0; i < uniqueCustomerIds.length; i += batchSize) {
            const batch = uniqueCustomerIds.slice(i, i + batchSize);
            //console.log(`Fetching the next ${batchSize} customers...`);
            const fetchPromises = batch.map(id => {
                const url = `https://api.servicetitan.io/crm/v2/tenant/${tenantID}/customers/${id}`;
                return fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': accessToken,
                        'ST-App-Key': appKey
                    }
                }).then(response => {
                    if (response.status === 404) return null; // Skip missing customers
                    if (response.status === 401) throw new Error('Unauthorized');
                    return response.json();
                });
            });

            const results = await Promise.all(fetchPromises);
            allCustomers = allCustomers.concat(results.filter(Boolean));
        }
        res.json({ data: allCustomers });
    } catch (error) {
        console.error('Error fetching customers:', error);
        if (error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
        } else {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
    // #endregion
});


app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});

