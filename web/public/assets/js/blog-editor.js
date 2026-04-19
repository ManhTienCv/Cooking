function wrapText(textarea, openTag, closeTag) {
    const len = textarea.value.length;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const replacement = openTag + selectedText + closeTag;

    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end, len);

    // Restore selection
    textarea.selectionStart = start + openTag.length;
    textarea.selectionEnd = end + openTag.length; // Keep selection inside tags? Or reset?
    // Let's cursor be after the open tag, or select the inner text if it existed
    if (end > start) {
        textarea.selectionEnd = start + openTag.length + selectedText.length;
    }
    textarea.focus();
}

document.addEventListener('DOMContentLoaded', function () {
    const textarea = document.getElementById('postContent');
    if (!textarea) return;

    const buttons = document.querySelectorAll('.format-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const tag = this.dataset.tag;

            switch (tag) {
                case 'b':
                    wrapText(textarea, '<strong>', '</strong>');
                    break;
                case 'i':
                    wrapText(textarea, '<em>', '</em>');
                    break;
                case 'h2':
                    wrapText(textarea, '<h2>', '</h2>');
                    break;
                case 'ul':
                    wrapText(textarea, '<ul>\n  <li>', '</li>\n</ul>');
                    break;
                case 'p':
                    wrapText(textarea, '<p>', '</p>');
                    break;
            }
        });
    });
});
