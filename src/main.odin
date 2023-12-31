package main

import "core:os"
import "core:io"
import "core:fmt"
import "core:encoding/endian"

Error :: union {
	os.Errno,
	io.Error,
}

read_u32 :: proc(r: io.Reader, order: endian.Byte_Order) -> (n: u32, err: io.Error) {
	buf: [size_of(u32)]u8
	io.read_full(r, buf[:]) or_return
	val, ok := endian.get_u32(buf[:], order)
	if !ok {
		err = io.Error.Unknown
	}
	return val, err
}

copy_data_from_cache :: proc(r: io.Reader, w: io.Writer) -> Error {
	data_len := read_u32(r, .Little) or_return
	url_len := read_u32(r, .Little) or_return

	io.seek(r, i64(url_len), .Current) or_return
	io.copy_n(w, r, i64(data_len)) or_return

	return io.Error.None
}

HELP :: "tower-unite-cache <input> <output>\n"

main :: proc() {
	if len(os.args) != 3 {
		fmt.print(HELP)
		os.exit(1)
	}

	readPath := os.args[1]
	writePath := os.args[2]

	readHandle, err1 := os.open(readPath)
	if err1 != 0 {
		fmt.panicf("could not open file: {}", err1)
	}
	defer os.close(readHandle)

	writeHandle, err2 := os.open(writePath, os.O_CREATE | os.O_WRONLY | os.O_TRUNC, 0o644)
	if err1 != 0 {
		fmt.panicf("could not open file: {}", err2)
	}
	defer os.close(writeHandle)

	readStream := os.stream_from_handle(readHandle)
	defer io.close(readStream)

	writeStream := os.stream_from_handle(writeHandle)
	defer io.close(writeStream)

	err := copy_data_from_cache(readStream, writeStream)
	if err != io.Error.None {
		fmt.panicf("could not copy data: {}", err)
	}
}
