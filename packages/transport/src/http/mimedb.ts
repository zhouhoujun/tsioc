import { MimeSource } from '../mime';


export const db: Record<string, MimeSource> = {
    "application/dns": {
        "source": "iana"
    },
    "application/dns+json": {
        "source": "iana",
        "compressible": true
    },
    "application/dns-message": {
        "source": "iana"
    },
    "application/ecmascript": {
        "source": "iana",
        "compressible": true,
        "extensions": ["es", "ecma"]
    },
    "application/elm+json": {
        "source": "iana",
        "charset": "UTF-8",
        "compressible": true
    },
    "application/elm+xml": {
        "source": "iana",
        "compressible": true
    },
    "application/geo+json": {
        "source": "iana",
        "compressible": true,
        "extensions": ["geojson"]
    },
    "application/gzip": {
        "source": "iana",
        "compressible": false,
        "extensions": ["gz"]
    },
    "application/javascript": {
        "source": "iana",
        "charset": "UTF-8",
        "compressible": true,
        "extensions": ["js", "mjs"]
    },
    "application/json": {
        "source": "iana",
        "charset": "UTF-8",
        "compressible": true,
        "extensions": ["json", "map"]
    },
    "application/msword": {
        "source": "iana",
        "compressible": false,
        "extensions": ["doc", "dot"]
    },
    "application/mp4": {
        "source": "iana",
        "extensions": ["mp4s", "m4p"]
    },
    "application/node": {
        "source": "iana",
        "extensions": ["cjs"]
    },
    "application/octet-stream": {
        "source": "iana",
        "compressible": false,
        "extensions": ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"]
    },
    "application/oda": {
        "source": "iana",
        "extensions": ["oda"]
    },
    "application/pdf": {
        "source": "iana",
        "compressible": false,
        "extensions": ["pdf"]
    },
    "application/rsd+xml": {
        "source": "apache",
        "compressible": true,
        "extensions": ["rsd"]
    },
    "application/rss+xml": {
        "source": "apache",
        "compressible": true,
        "extensions": ["rss"]
    },
    "application/rtf": {
        "source": "iana",
        "compressible": true,
        "extensions": ["rtf"]
    },
    "application/x-7z-compressed": {
        "source": "apache",
        "compressible": false,
        "extensions": ["7z"]
    },
    "application/xhtml+xml": {
        "source": "iana",
        "compressible": true,
        "extensions": ["xhtml", "xht"]
    },
    "application/xliff+xml": {
        "source": "iana",
        "compressible": true,
        "extensions": ["xlf"]
    },
    "application/xml": {
        "source": "iana",
        "compressible": true,
        "extensions": ["xml", "xsl", "xsd", "rng"]
    },
    "application/xml-dtd": {
        "source": "iana",
        "compressible": true,
        "extensions": ["dtd"]
    },
    "application/xslt+xml": {
        "source": "iana",
        "compressible": true,
        "extensions": ["xsl", "xslt"]
    },
    "application/xspf+xml": {
        "source": "apache",
        "compressible": true,
        "extensions": ["xspf"]
    },
    "application/zip": {
        "source": "iana",
        "compressible": false,
        "extensions": ["zip"]
    },
    "application/zlib": {
        "source": "iana"
    },
    "audio/3gpp": {
        "source": "iana",
        "compressible": false,
        "extensions": ["3gpp"]
    },
    "audio/3gpp2": {
        "source": "iana"
    },
    "audio/aac": {
        "source": "iana"
    },
    "audio/ac3": {
        "source": "iana"
    },
    "audio/adpcm": {
        "source": "apache",
        "extensions": ["adp"]
    },
    "audio/midi": {
        "source": "apache",
        "extensions": ["mid", "midi", "kar", "rmi"]
    },
    "audio/mp3": {
        "compressible": false,
        "extensions": ["mp3"]
    },
    "audio/mp4": {
        "source": "iana",
        "compressible": false,
        "extensions": ["m4a", "mp4a"]
    },
    "audio/mpeg": {
        "source": "iana",
        "compressible": false,
        "extensions": ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"]
    },
    "audio/wav": {
        "compressible": false,
        "extensions": ["wav"]
    },
    "audio/wave": {
        "compressible": false,
        "extensions": ["wav"]
    },
    "font/collection": {
        "source": "iana",
        "extensions": ["ttc"]
    },
    "font/otf": {
        "source": "iana",
        "compressible": true,
        "extensions": ["otf"]
    },
    "font/sfnt": {
        "source": "iana"
    },
    "font/ttf": {
        "source": "iana",
        "compressible": true,
        "extensions": ["ttf"]
    },
    "font/woff": {
        "source": "iana",
        "extensions": ["woff"]
    },
    "font/woff2": {
        "source": "iana",
        "extensions": ["woff2"]
    },
    "image/bmp": {
        "source": "iana",
        "compressible": true,
        "extensions": ["bmp"]
    },
    "image/jpeg": {
        "source": "iana",
        "compressible": false,
        "extensions": ["jpeg", "jpg", "jpe"]
    },
    "image/png": {
        "source": "iana",
        "compressible": false,
        "extensions": ["png"]
    },
    "image/svg+xml": {
        "source": "iana",
        "compressible": true,
        "extensions": ["svg", "svgz"]
    },
    "image/tiff": {
        "source": "iana",
        "compressible": false,
        "extensions": ["tif", "tiff"]
    },
    "image/tiff-fx": {
        "source": "iana",
        "extensions": ["tfx"]
    },

    "text/css": {
        "source": "iana",
        "charset": "UTF-8",
        "compressible": true,
        "extensions": ["css"]
    },
    "text/csv": {
        "source": "iana",
        "compressible": true,
        "extensions": ["csv"]
    },
    "text/html": {
        "source": "iana",
        "compressible": true,
        "extensions": ["html", "htm", "shtml"]
    },
    "text/jade": {
        "extensions": ["jade"]
    },
    "text/javascript": {
        "source": "iana",
        "compressible": true
    },
    "text/jcr-cnd": {
        "source": "iana"
    },
    "text/jsx": {
        "compressible": true,
        "extensions": ["jsx"]
    },
    "text/less": {
        "compressible": true,
        "extensions": ["less"]
    },
    "text/markdown": {
        "source": "iana",
        "compressible": true,
        "extensions": ["markdown", "md"]
    },
    "text/plain": {
        "source": "iana",
        "compressible": true,
        "extensions": ["txt", "text", "conf", "def", "list", "log", "in", "ini"]
    },
    "text/rtf": {
        "source": "iana",
        "compressible": true,
        "extensions": ["rtf"]
    },
    "text/stylus": {
        "extensions": ["stylus", "styl"]
    },
    "text/troff": {
        "source": "iana",
        "extensions": ["t", "tr", "roff", "man", "me", "ms"]
    },
    "text/turtle": {
        "source": "iana",
        "charset": "UTF-8",
        "extensions": ["ttl"]
    },
    "text/yaml": {
        "compressible": true,
        "extensions": ["yaml", "yml"]
    },

    "video/3gpp": {
        "source": "iana",
        "extensions": ["3gp", "3gpp"]
    },
    "video/jpeg": {
        "source": "iana",
        "extensions": ["jpgv"]
    },
    "video/mp4": {
        "source": "iana",
        "compressible": false,
        "extensions": ["mp4", "mp4v", "mpg4"]
    },
    "video/mpeg": {
        "source": "iana",
        "compressible": false,
        "extensions": ["mpeg", "mpg", "mpe", "m1v", "m2v"]
    },
    "video/mpeg4-generic": {
        "source": "iana"
    },
}
