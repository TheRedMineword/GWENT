const statusEl =
    document.getElementById('status');

const detailsEl =
    document.getElementById('details');

const progressEl =
    document.getElementById('bar');

window.updater.onStatus(text => {

    statusEl.innerText = text;
});

window.updater.onProgress(data => {
document.body.classList.add('ready');

    const percent =
        Math.floor(
            (data.current / data.total) * 100
        );

    statusEl.innerText =
        'Downloading update...';

    detailsEl.innerText =
        `${data.current}/${data.total} : ${data.file}`;

    progressEl.value = percent;
});

function updateProgress(percent, text) {

    document.getElementById(
        "progress-fill"
    ).style.width = `${percent}%`;

    document.getElementById(
        "status"
    ).textContent = text;

    if (percent > 0) {
        document.body.classList.add(
            "ready"
        );
    }
}