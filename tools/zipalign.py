#!/usr/bin/env python3
"""Minimal zipalign: rewrites an (unsigned) APK so every STORED entry's data starts on a
4-byte boundary (.so files on 16 KiB pages), padding the local header's extra field.
Compressed entries are copied byte-for-byte. Usage: zipalign.py in.apk out.apk"""
import struct
import sys
import zipfile


def align(src, dst, alignment=4):
    zin = zipfile.ZipFile(src)
    raw = open(src, 'rb').read()
    out = bytearray()
    central = []
    for info in zin.infolist():
        off = info.header_offset
        sig, ver, flag, method, mtime, mdate, crc, csize, usize, nlen, elen = struct.unpack('<IHHHHHIIIHH', raw[off:off + 30])
        assert sig == 0x04034B50, 'bad local header'
        name = raw[off + 30:off + 30 + nlen]
        extra = raw[off + 30 + nlen:off + 30 + nlen + elen]
        data_start = off + 30 + nlen + elen
        csize = info.compress_size
        data = raw[data_start:data_start + csize]
        if flag & 0x08:  # data descriptor follows; we drop it and store sizes in the header
            flag &= ~0x08
        new_off = len(out)
        a = 16384 if info.filename.endswith('.so') else alignment
        if method == 0:
            base = new_off + 30 + nlen
            # drop old padding-only extras, keep nothing (APK extras are not meaningful here)
            extra = b''
            pad = (-(base + len(extra))) % a
            extra = extra + b'\0' * pad
        out += struct.pack('<IHHHHHIIIHH', 0x04034B50, ver, flag, method, mtime, mdate, info.CRC, csize, info.file_size, nlen, len(extra))
        out += name + extra + data
        central.append((info, new_off, flag, method, mtime, mdate, name))
    cd_start = len(out)
    for info, new_off, flag, method, mtime, mdate, name in central:
        out += struct.pack('<IHHHHHHIIIHHHHHII', 0x02014B50, info.create_version | (info.create_system << 8),
                           info.extract_version, flag, method, mtime, mdate, info.CRC, info.compress_size,
                           info.file_size, len(name), 0, 0, 0, 0, info.external_attr, new_off)
        out += name
    cd_size = len(out) - cd_start
    out += struct.pack('<IHHHHIIH', 0x06054B50, 0, 0, len(central), len(central), cd_size, cd_start, 0)
    open(dst, 'wb').write(out)


def check(path, alignment=4):
    raw = open(path, 'rb').read()
    bad = []
    for info in zipfile.ZipFile(path).infolist():
        off = info.header_offset
        nlen, elen = struct.unpack('<HH', raw[off + 26:off + 30])
        start = off + 30 + nlen + elen
        a = 16384 if info.filename.endswith('.so') else alignment
        if info.compress_type == 0 and start % a:
            bad.append(info.filename)
    return bad


if __name__ == '__main__':
    if sys.argv[1] == '--check':
        bad = check(sys.argv[2])
        print('aligned' if not bad else 'NOT aligned: ' + ', '.join(bad))
        sys.exit(1 if bad else 0)
    align(sys.argv[1], sys.argv[2])
