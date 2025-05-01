let table;

/**
 * Shows or hides the login page
 * @param {boolean} visible - Show or hide the login page
 */

function setLogin(visible) {
    // #region Show/Hide Login
    const login = document.getElementById('login-area');
    const app = document.getElementById('app-area');
    if (visible) {
        login.style.display = 'block';
        app.style.display = 'none';
    } else {
        login.style.display = 'none';
        app.style.display = 'block';
    }
    // #endregion
}

let tagTypesData = []


document.addEventListener('DOMContentLoaded', () => {
    // #region page loaded

    fetch('/authenticate').then(response => {
        if (response.status === 401) {
            console.log('Not authenticated');
            setLogin(true);
        } else {
            console.log('Authenticated');
            setLogin(false);
        }

    });

    //initialize table
    table = new Tabulator('#table',
        {
            pagination: 'local',
            paginationSize: 15,
            columns: [
                { title: 'Job ID', field: 'id' },
                { title: 'Job Status', field: 'jobStatus' },
                { title: 'Completed Date', field: 'completedDate' },
                { title: 'Job Location Street', field: 'locationStreet' },
                { title: 'Tags', field: 'tags' },//, visible: false
                { title: 'Job Location City', field: 'locationCity' },
                { title: 'Job Location State', field: 'locationState' },
                { title: 'Job Location Zip', field: 'locationZip' },
                { title: 'Total Cost', field: 'cost' },
                { title: 'Customer ID', field: 'customerId' },
                { title: 'Customer Name', field: 'name' },
                { title: 'Customer Type', field: 'customerType' },
                { title: 'Customer Street', field: 'customerStreet' },
                { title: 'Customer City', field: 'customerCity' },
                { title: 'Customer State', field: 'customerState' },
                { title: 'Customer Zip', field: 'customerZip' },
                { title: 'Do Not Mail', field: 'doNotMail' }




            ] //create columns from data field names
        });

    function applyMultiSelectFilter() {
        const selectedTags = Array.from(document.querySelectorAll('#tag-type option:checked'))
            .map(option => Number(option.value));
        //console.log(selectedTags)

        const isIncludeMode = document.getElementById('include-tags-toggle').checked;
        //  if the include-tags-toggle is toggled on it will show only jobs with the selected tags if not it excludes any jobs with the selected tags
        if (selectedTags.length > 0) {
            table.setFilter(function (rowData) {
                const rowTags = rowData.tags;

                return isIncludeMode ? selectedTags.some(tag => rowTags.includes(tag)) : selectedTags.every(tag => !rowTags.includes(tag))
            }
            );
        } else {
            table.clearFilter();
        }
    }

    // Add event listener to the select element
    const selectElement = document.getElementById('tag-type');
    selectElement.addEventListener('change', function () {
        applyMultiSelectFilter();
    });

    // Add event listener to the exclude tags toggle
    document.getElementById('include-tags-toggle').addEventListener('change', function () {
        applyMultiSelectFilter();
    });




    // Fetch tags
    const tenantID = document.getElementById('tenant-id').value;
    fetch('/tags', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tenantID: tenantID })
    })
        .then(response => response.json())
        .then(async data => {
            tagTypesData = data.data
            //console.log(tagTypesData)
            // Populate the select element with options
            const selectElement = document.getElementById('tag-type');

            selectElement.innerHTML = ''; // Clear existing options

            tagTypesData.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag.id;
                option.textContent = tag.name;
                selectElement.appendChild(option);
            });

            NiceSelect.bind(selectElement, { searchable: true });


        })
        .catch(error => {
            console.error('Error fetching tags:', error);
        });




    // Trigger download
    document.getElementById('download-csv').addEventListener('click', function () {
        table.download('csv', 'data.csv');
    });
    document.getElementById('download-csv').disabled = true


    // #endregion
});

document.getElementById('login-btn').addEventListener('click', () => {
    // #region user clicks Login button
    const clientId = document.getElementById('client-id').value;
    const clientSecret = document.getElementById('client-secret').value;

    const data = { clientId, clientSecret };

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (response.status === 401) {
                console.log('Unauthorized');
                setLogin(true);
                return;
            }
            setLogin(false);
            response.json()
        })

    // #endregion
}
);

document.getElementById('fetch-btn').addEventListener('click', () => {
    // #region user clicks Get button

    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const tenantID = document.getElementById('tenant-id').value;


    const data = { startDate, endDate, tenantID };

    // Show loading spinner
    document.getElementById('loading-spinner').style.display = 'flex';



    // Fetch job data from jobs endpoint
    fetch('/jobs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(async jobsData => {
            const jobsArray = jobsData.data
            const invoiceIds = jobsArray.map(job => job.invoiceId) // Get all job ids from the jobs array
            const customerIds = jobsArray.map(job => job.customerId) // Get all customer ids from the jobs array
            //console.log(jobsArray)
            //console.log(invoiceIds)
            //console.log(customerIds)

            // Fetch customer name, address, job location, and total cost data for each job from the invoices endpoint
            const invoiceResponse = await fetch('/invoices', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ invoiceIds, tenantID })
            });
            const invoiceData = await invoiceResponse.json();
            const invoiceMap = new Map();
            invoiceData.data.forEach(invoice => {
                invoiceMap.set(invoice.id, invoice);
            });

            const jobsWithInvoiceData = jobsArray.map(job => {
                // Find the invoice data for the current job
                const invoice = invoiceMap.get(job.invoiceId)
                if (invoice) {
                    job.completedDate = new Date(job.completedOn).toISOString().split("T")[0] // Format completedOn to remove timestamp
                    job.cost = invoice.total; // Add invoice total to the job object
                    job.name = invoice.customer.name // Set and add name from invoice data to the job object
                    const customerAddress = invoice.customerAddress // Set customerAddress to the customer address in invoice
                    // Add address fields for customer to job object
                    job.customerStreet = customerAddress.street
                    job.customerCity = customerAddress.city
                    job.customerState = customerAddress.state
                    job.customerZip = customerAddress.zip
                    const address = invoice.locationAddress // Set address to the locationAddress object from the invoice
                    // Add location address fields to job location
                    job.locationStreet = address.street
                    job.locationCity = address.city
                    job.locationState = address.state
                    job.locationZip = address.zip

                }
                return job;
            }
            );
            //console.log(jobsWithInvoiceData)

            const customerResponse = await fetch('/customers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ customerIds, tenantID })
            });
            const customerData = await customerResponse.json();
            const customerMap = new Map();
            customerData.data.forEach(customer => {
                customerMap.set(customer.id, customer);
            });

            const jobsWithCustomerData = jobsWithInvoiceData.map(job => {
                // Find the customer data for the current job
                const customer = customerMap.get(job.customerId)
                if (customer) {
                    job.customerData = customer; // Add customer data to the job object
                    job.customerType = customer.type // Set and add customer type to job object
                    job.doNotMail = customer.doNotMail // Set and add if the customeris on the do not mail list to the job object
                }
                return job;
            }
            );
            //console.log(jobsWithCustomerData)



            const jobsWithTags = jobsWithCustomerData.map(job => {
                tagIds = []
                // Loop through the tags and add them to the job object
                job.tagTypeIds.forEach(tag => {
                    tagIds.push(tag)
                })
                // Remove duplicates from the tagIds array
                job.tagTypeIds = [...new Set(tagIds)]

                job.tags = tagIds // Set and add the tags to the job object
                return job;
            });

            // Put data into table
            table.setData(jobsWithTags);

            // Hide loading spinner
            document.getElementById('tags').style.display = 'flex';
            document.getElementById('loading-spinner').style.display = 'none';
            document.getElementById('download-csv').disabled = false
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
            // Hide loading spinner
            document.getElementById('loading-spinner').style.display = 'none';
        });
    // #endregion
});
