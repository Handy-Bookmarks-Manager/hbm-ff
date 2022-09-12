export function getOrigin(string) {
    try {
        const url = new URL(string)
        return url.origin
    } catch (e) {
        return null
    }
}
export function startsWith(str, reg, offset) {
    let regex = `^.{${(0, offset)}}(${reg})`
    let final = new RegExp(regex, 'i')
    let found = str.match(final)
    return found ? true : found
}
export function getStatusText(statusCode) {
    switch (statusCode) {
        case 522:
            return 'Connection timed out'
        default:
            return 'Unknown'
    }
}
export function splitByWhiteSpaces(string) {
    return string.split(/\r\n|\n/)
}

export function isValidUrl(string) {
    try {
        return Boolean(new URL(string))
    } catch (e) {
        return false
    }
}
