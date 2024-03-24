struct ImageCache {
    u32 data_size;
    u32 url_size;
    char url[url_size];
    u8 data[data_size] [[sealed]];
};

ImageCache file @ 0x00 [[inline]];
