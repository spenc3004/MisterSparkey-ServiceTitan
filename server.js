const express = require('express');
const app = express();
const PORT = 3000;
require('dotenv').config();
const appKey = process.env.APP_KEY;


app.use(express.static('public'));
app.use(express.json()); //middleware to pull json out of the request


app.post('/login', async (req, res) => {
    // #region POST /login
    const clientId = req.body.clientId;
    const clientSecret = req.body.clientSecret;

    const url = "https://auth-integration.servicetitan.io/connect/token";
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
    const accessToken = req.headers.cookie;
    if (!accessToken) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    res.json({ message: 'Success' });
    // #endregion
});

app.post('/jobs', async (req, res) => {
    // #region POST /jobs
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const tenantID = req.body.tenantID;
    const accessToken = req.headers.cookie.split('=')[1];

    let allJobs = [];
    let page = 1;
    let hasMore = true;

    try {
        while (hasMore) {
            const fetchPromises = [];
            const batchSize = 5; // Number of pages to fetch concurrently

            // Create an array of promises to fetch a batch of pages concurrently
            for (let i = 0; i < batchSize; i++) {
                const url = `https://api-integration.servicetitan.io/jpm/v2/tenant/${tenantID}/jobs?jobStatus=Completed&page=${page + i}&completedOnOrAfter=${startDate}&completedBefore=${endDate}`;
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
    const invoiceId = req.body.invoiceId;
    const tenantID = req.body.tenantID;
    const accessToken = req.headers.cookie.split('=')[1];

    try {
        const invoiceUrl = `https://api-integration.servicetitan.io/accounting/v2/tenant/${tenantID}/invoices?ids=${invoiceId}`;
        const response = await fetch(invoiceUrl, {
            method: 'GET',
            headers: {
                'Authorization': accessToken,
                'ST-App-Key': appKey
            }
        });

        if (response.status === 401) {
            throw new Error('Unauthorized');
        }

        const invoicesData = await response.json();
        res.json({ data: invoicesData.data });
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

app.post('/customers', async (req, res) => {
    // #region POST /customers
    const customerId = req.body.customerId;
    const tenantID = req.body.tenantID;
    const accessToken = req.headers.cookie.split('=')[1];

    try {
        const customerUrl = `https://api-integration.servicetitan.io/crm/v2/tenant/${tenantID}/customers/?ids=${customerId}`;
        const response = await fetch(customerUrl, {
            method: 'GET',
            headers: {
                'Authorization': accessToken,
                'ST-App-Key': appKey
            }
        });

        if (response.status === 401) {
            throw new Error('Unauthorized');
        }

        const customerData = await response.json();
        res.json({ data: customerData });
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
/*
app.post('/membershipTypes', async (req, res) => {
    // #region POST /membershipTypes
    const tenantId = req.body.tenantID;
    const accessToken = req.headers.cookie.split('=')[1];

    try {
        const url = `https://api-integration.servicetitan.io/memberships/v2/tenant/${tenantId}/membership-types`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': accessToken,
                'ST-App-Key': appKey
            }
        });

        if (response.status === 401) {
            throw new Error('Unauthorized');
        }

        const membershipTypesData = await response.json();
        res.json({ data: membershipTypesData.data });
    } catch (error) {
        console.error('Error fetching membership types:', error);
        if (error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
        } else {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
    // #endregion
});

app.post('/memberships', async (req, res) => {
    // #region POST /memberships
    const tenantId = req.body.tenantID;
    const customerId = req.body.customerId
    const accessToken = req.headers.cookie.split('=')[1];

    try {
        const membershipTypesUrl = `https://api-integration.servicetitan.io/memberships/v2/tenant/${tenantId}/memberships/?customerIds=${customerId}`;
        const response = await fetch(membershipTypesUrl, {
            method: 'GET',
            headers: {
                'Authorization': accessToken,
                'ST-App-Key': appKey
            }
        });

        if (response.status === 401) {
            throw new Error('Unauthorized');
        }

        const membershipsData = await response.json();

        //Handeling customers who have never had a membership as it will return empty
        if (!membershipsData.data || membershipsData.data.length === 0) {
            return res.json({
                data: [{ status: 'N/A', membershipTypeId: 'N/A' }]
            });
        }

        res.json({ data: membershipsData.data });
    } catch (error) {
        console.error('Error fetching memberships:', error);
        if (error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
        } else {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
    // #endregion
});

*/

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});

