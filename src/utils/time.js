export function getNiceDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-us', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}
