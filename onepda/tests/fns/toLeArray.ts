export function toLeArray(num) {
    return [
        num & 255,
        (num >> 8) & 255,
        (num >> 16) & 255,
        (num >> 24) & 255,
    ];
}
