const { Gdk, GdkPixbuf, GLib, GObject, Gtk, Gio } = imports.gi;

const Renderer = imports.ui.renderer;
const Utils = imports.ui.utils;

/* Gio.File */
Gio._promisify(Gio.File.prototype, 'read_async');

/* Gio.InputStream */
Gio._promisify(Gio.InputStream.prototype, 'read_bytes_async');
Gio._promisify(Gio.InputStream.prototype, 'close_async', 'close_finish');

/* GdkPixbuf.PixbufAnimation */
Gio._promisify(GdkPixbuf.PixbufAnimation, 'new_from_stream_async', 'new_from_stream_finish')

class TowerUniteCacheRenderer extends Gtk.DrawingArea {
    get ready() {
        return !!this._ready;
    }

    get fullscreen() {
        return !!this._fullscreen;
    }

    #url;
    #pix = null;
    #scaledSurface = null;
    #timeoutId = 0;

    constructor(file) {
        super();

        this.#createImageTexture(file)
            .catch(e => this.emit('error', e));

        this.connect('destroy', this.#onDestroy.bind(this));
    }

    vfunc_get_preferred_width() {
        return [1, this.#pix ? this.#pix.get_width() : 1];
    }

    vfunc_get_preferred_height() {
        return [1, this.#pix ? this.#pix.get_height() : 1];
    }

    vfunc_size_allocate(allocation) {
        super.vfunc_size_allocate(allocation);
        this.#ensureScaledPix();
    }

    vfunc_draw(context) {
        if (!this.#scaledSurface) {
            return false;
        }

        let width = this.get_allocated_width();
        let height = this.get_allocated_height();

        let scaleFactor = this.get_scale_factor();
        let offsetX = (width - this.#scaledSurface.getWidth() / scaleFactor) / 2;
        let offsetY = (height - this.#scaledSurface.getHeight() / scaleFactor) / 2;

        context.setSourceSurface(this.#scaledSurface, offsetX, offsetY);
        context.paint();
        return false;
    }

    async #createImageTexture(file) {
        const stream = await file.read_async(GLib.PRIORITY_DEFAULT, null)
            .catch(e => this.emit('error', e))

        const dataStream = Gio.DataInputStream.new(stream)
        dataStream.set_byte_order(Gio.DataStreamByteOrder.LITTLE_ENDIAN);

        const dataLen = dataStream.read_uint32(null)
        const urlLen = dataStream.read_uint32(null)
        const urlBytes = await dataStream.read_bytes_async(urlLen, GLib.PRIORITY_DEFAULT, null)
        this.#url = new TextDecoder().decode(urlBytes.get_data())

        this.#textureFromStream(dataStream);
    }

    async #textureFromStream(stream) {
        let anim = await GdkPixbuf.PixbufAnimation.new_from_stream_async(stream, null).catch(e => logError(e))

        this._iter = anim.get_iter(null);
        this.#update();

        await stream.close_async(GLib.PRIORITY_DEFAULT, null).catch(e => logError(e, 'Unable to close the stream'));
    }

    #ensureScaledPix() {
        if (!this.#pix) return;

        let scaleFactor = this.get_scale_factor();
        let width = this.get_allocated_width() * scaleFactor;
        let height = this.get_allocated_height() * scaleFactor;

        // Scale original to fit, if necessary
        let origWidth = this.#pix.get_width();
        let origHeight = this.#pix.get_height();

        let scaleX = width / origWidth;
        let scaleY = height / origHeight;
        let scale = Math.min(scaleX, scaleY);

        // Do not upscale unless we're fullscreen
        if (!this.fullscreen) {
            scale = Math.min(scale, 1.0 * scaleFactor);
        }

        let newWidth = Math.floor(origWidth * scale);
        let newHeight = Math.floor(origHeight * scale);

        let scaledWidth = this.#scaledSurface ? this.#scaledSurface.getWidth() : 0;
        let scaledHeight = this.#scaledSurface ? this.#scaledSurface.getHeight() : 0;

        if (newWidth == scaledWidth && newHeight == scaledHeight) return;

        // Avoid blur if we're upscaling a lot, e.g. when fullscreening
        // a small image. We use nearest neighbor interpolation for that case.
        let pixelScale = 3.0 * scaleFactor;
        let interpType = scale >= pixelScale
            ? GdkPixbuf.InterpType.NEAREST
            : GdkPixbuf.InterpType.BILINEAR;

        let scaledPixbuf = this.#pix.scale_simple(newWidth, newHeight, interpType);
        this.#scaledSurface = Gdk.cairo_surface_create_from_pixbuf(scaledPixbuf, scaleFactor, this.get_window());
    }

    #setPix(pix) {
        this.#pix = pix;
        this.#scaledSurface = null;

        this.queue_resize();
        this.isReady();
    }

    #update() {
        this.#setPix(this._iter.get_pixbuf().apply_embedded_orientation());

        let delay = this._iter.get_delay_time();
        if (delay == -1) {
            return;
        }

        this.#timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
            this.#timeoutId = 0;
            if (this._iter.advance(null)) {
                this.#update();
            }
            return false;
        });
    }

    #onDestroy() {
        if (this.#timeoutId) {
            GLib.source_remove(this.#timeoutId);
            this.#timeoutId = 0;
        }
    }
}

var Klass = GObject.registerClass({
    Implements: [Renderer.Renderer],
    Properties: {
        fullscreen: GObject.ParamSpec.boolean('fullscreen', '', '',
            GObject.ParamFlags.READABLE,
            false),
        ready: GObject.ParamSpec.boolean('ready', '', '',
            GObject.ParamFlags.READABLE,
            false)
    }
}, TowerUniteCacheRenderer)

var mimeTypes = [
    "application/x-towerunite-cache"
];