async function showPage({ rootEl, peertubeHelpers }) {
    // Redirect to login page if not auth
    if (!peertubeHelpers.isLoggedIn()) return (window.location.href = "/login");

    const loading = await peertubeHelpers.translate("Loading");
    rootEl.innerHTML = loading + "...";

    // Get settings
    const baseUrl = peertubeHelpers.getBaseRouterRoute();

    let dateFrom = new Date().getTime() - 1000 * 60 * 60 * 24 * 28;
    let dateFromString = new Date(dateFrom).toISOString().split("T")[0];

    // Fetch admin stats
    const response = await fetch(baseUrl + "/stats?from=" + dateFromString, {
        method: "GET",
        headers: peertubeHelpers.getAuthHeader(),
    });
    const data = await response.json();

    // If have error
    if (!data || !data.status || (data.status && data.status !== "success")) {
        peertubeHelpers.notifier.error(data.message || "Unknown error");
        rootEl.innerHTML = `<h1>${data.message || "Unknown error"}</h1>`;
        return;
    }

    rootEl.innerHTML = `
        <div class="container">
            <h1>${await peertubeHelpers.translate("Instance statistics")}</h1>

            <div class="row">
                <div class="col-sm-12 col-md-6 col-lg-2 card">
                    <div class="card-body text-center">
                        <h5 class="card-title">${await peertubeHelpers.translate("Total Accounts")}</h5>
                        <p class="card-text">${data.data.usersCount}</p>
                    </div>
                </div>
                <div class="col-sm-12 col-md-6 col-lg-2 card">
                    <div class="card-body text-center">
                        <h5 class="card-title">${await peertubeHelpers.translate("Registered this month")}</h5>
                        <p class="card-text">${data.data.usersThisMonth}</p>
                    </div>
                </div>
                <div class="col-sm-12 col-md-6 col-lg-2 card">
                    <div class="card-body text-center">
                        <h5 class="card-title">${await peertubeHelpers.translate("Total Videos")}</h5>
                        <p class="card-text">${data.data.videosCount}</p>
                    </div>
                </div>
                <div class="col-sm-12 col-md-6 col-lg-2 card">
                    <div class="card-body text-center">
                        <h5 class="card-title">${await peertubeHelpers.translate("Uploaded this month")}</h5>
                        <p class="card-text">${data.data.videosThisMonth}</p>
                    </div>
                </div>
                <div class="col-sm-12 col-md-6 col-lg-2 card">
                    <div class="card-body text-center">
                        <h5 class="card-title">${await peertubeHelpers.translate("Open abuses")}</h5>
                        <p class="card-text">${data.data.openAbusesCount}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="card mt-4">
            <div class="card-body">
                <form method="GET" action="#" id="refresh-stats">
                    <div class="row">
                        <h5 class="col-sm-12 col-md-6 col-lg-2 card-title">${await peertubeHelpers.translate("Filter")}</h5>
                        <div class="col-sm-12 col-md-6 col-lg-2 form-group">
                            <label for="dateFrom">${await peertubeHelpers.translate("Date from")}</label>
                            <input type="date" class="form-control" id="dateFrom" placeholder="${await peertubeHelpers.translate("Date from")}">
                        </div>
                        <div class="col-sm-12 col-md-6 col-lg-2 form-group">
                            <label for="dateTo">${await peertubeHelpers.translate("Date to")}</label>
                            <input type="date" class="form-control" id="dateTo" placeholder="${await peertubeHelpers.translate("Date to")}">
                        </div>

                        <div class="col-sm-12 col-md-6 col-lg-2 form-group">
                            <label for="groupBy">${await peertubeHelpers.translate("Group by")}</label>
                            <select class="form-control" id="groupBy">
                                <option value="day">${await peertubeHelpers.translate("Day")}</option>
                                <option value="month">${await peertubeHelpers.translate("Month")}</option>
                                <option value="year">${await peertubeHelpers.translate("Year")}</option>
                            </select>
                        </div>

                        <button type="submit" class="btn btn-primary">${await peertubeHelpers.translate("Filter")}</button>
                    </div>
                </form>
            </div>
        </div>

        <div id="chart_div" class="mt-4" style="width: 100%; height: 500px;"></div>
    `;


    // Insert Google chart javascript to the dom
    const googleChart = document.createElement("script");
    googleChart.type = "text/javascript";
    googleChart.src = "https://www.gstatic.com/charts/loader.js";
    document.body.appendChild(googleChart);

    googleChart.onload = () => {
        refreshChart(data, null, null, peertubeHelpers);
        document.getElementById("refresh-stats").onsubmit = (e) => {
            e.preventDefault();
            refreshChart(null, {
                from: document.getElementById("dateFrom").value,
                to: document.getElementById("dateTo").value,
                groupBy: document.getElementById("groupBy").value,
            }, baseUrl, peertubeHelpers);
        };
    };

}

export { showPage };


async function refreshChart(data = null, params = null, baseUrl = null, peertubeHelpers = null) {
    if(!data) {
        // Fetch admin stats
        const response = await fetch(baseUrl + "/stats?" + (params ? "&" + new URLSearchParams(params).toString() : ""), {
            method: "GET",
            headers: await peertubeHelpers.getAuthHeader(),
        });
        var data = await response.json();
    }

    let drawChart = async function () {
        var array = [
            ['Date', await peertubeHelpers.translate('Videos seen'), await peertubeHelpers.translate('Total Views'), await peertubeHelpers.translate('Average views per video')],
        ];
        // data.data.videoViewsStats.map((item) => {
        for (let i = 0; i < data.data.videoViewsStats.length; i++) {
            const item = data.data.videoViewsStats[i];
            // items contain views
            array.push([item.date, item.items.length, item.items.map(item => item.views).reduce((a, b) => a + b), Math.round(item.items.map(item => item.views).reduce((a, b) => a + b) / item.items.length)]);
        }
        console.log(array)
        var dataChart = google.visualization.arrayToDataTable(array);
        var options = {
            title: await peertubeHelpers.translate('Videos views'),
            hAxis: { title: 'Date', titleTextStyle: { color: '#333' } },
            vAxis: { minValue: 0 }
        };

        var chart = new google.visualization.AreaChart(document.getElementById('chart_div'));
        chart.draw(dataChart, options);
    }

    google.charts.load('current', { 'packages': ['corechart'] });
    google.charts.setOnLoadCallback(drawChart);
}