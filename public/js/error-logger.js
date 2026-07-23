window.addEventListener('error', function(e) {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.backgroundColor = 'red';
    div.style.color = 'white';
    div.style.zIndex = '999999';
    div.style.padding = '10px';
    div.style.fontFamily = 'monospace';
    div.innerHTML = 'ERROR: ' + e.message + '<br>Line: ' + e.lineno + '<br>Col: ' + e.colno + '<br>File: ' + e.filename + '<br><pre>' + (e.error ? e.error.stack : '') + '</pre>';
    document.body.appendChild(div);
});
