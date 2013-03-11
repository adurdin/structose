"use strict";

// Stub in case you're not using require.js
if (typeof define == "undefined") {
    window.define = function(fn) {
        window.structose = fn();
    };
}

define(function() {
    function Struct(fields) {
        var q,
            field,
            totalSize = 0,
            size;
        this.fields = Array.prototype.slice.call(fields);
        // Compute size
        q = this.fields.slice()
        while (q.length > 0) {
            field = q.shift();
            size = field.size;
            if (size >= 0 && totalSize >= 0) {
                totalSize += size;
            } else if (totalSize >= 0) {
                totalSize = -1;
            }
        }

        this.size = totalSize;
    }
    Struct.prototype = {
        read: function(buffer, offset, parentReader) {
            var i,
                fields = this.fields.slice(),
                reader = new StructReader(this, buffer, offset, parentReader),
                field,
                newFields;
            while (fields.length > 0) {
                field = fields.shift();
                newFields = reader.readField(field);
                if (newFields != null) {
                    Array.prototype.unshift.apply(fields, newFields);
                }
            }
            return reader.end();
        }
    };

    function StructReader(struct, buffer, offset, parent) {
        this.struct = struct;
        this.buffer = buffer;
        this.offset = offset;
        this.parent = parent;
        this.view = new DataView(buffer);
        this.field = null;
        this.obj = {
            size: 0
        };
        this.obj.prototype = struct;
    }
    StructReader.prototype = {
        readField: function(field) {
            var size = field.size,
                value,
                newFields = null;
            this.field = field;
            this.setSize = function(actualSize) {
                size = actualSize;
            };
            this.insertFields = function(fields) {
                newFields = fields;
            };
            value = field.read.call(field, this);
            if (field.name != null) {
                this.obj[field.name] = value;
            }
            this.obj.size += size;
            this.offset += size;
            return newFields;
        },
        end: function() {
            return this.obj;
        },
        getFieldValue: function(name) {
            var reader = this,
                obj = reader.obj,
                parts = name.split('.'),
                part;
            while (parts.length > 0) {
                part = parts.shift();
                if (part == "parent") {
                    reader = reader.parent;
                    obj = reader.obj;
                } else {
                    obj = obj[name];
                }
            }
            return obj;
        }
    };

    function Field(name, size, readFunc) {
        this.name = name;
        this.size = size;
        this.read = readFunc;
    }

    function ConditionalFields(conditionFunc, fields) {
        return new Field(null, -1, function(reader) {
            reader.setSize(0);
            if (conditionFunc(reader)) {
                reader.insertFields(fields);
            }
            return null;
        });
    }

    function _MakeTyped(arrayType, dataViewMethod) {
        return function(name) {
            return new Field(name, arrayType.BYTES_PER_ELEMENT, function(reader) {
                return reader.view[dataViewMethod](reader.offset, true);
            });
        };
    }

    function _MakeTypedArray(arrayType, dataViewMethod) {
        return function(name, length) {
            return new Field(name, length * arrayType.BYTES_PER_ELEMENT, function(reader) {
                var i, array;
                if (length > 0) {
                    if (length % arrayType.BYTES_PER_ELEMENT == 0) {
                        return new arrayType(reader.buffer, reader.offset, length);
                    } else {
                        array = [];
                        for (i = 0; i < length; i++) {
                            array.push(reader.view[dataViewMethod](reader.offset + i * arrayType.BYTES_PER_ELEMENT, true));
                        }
                        return array;
                    }
                } else {
                    return [];
                }
            });
        };
    }

    function _MakeTypedVariableArray(arrayType) {
        return function(name, lengthFunc) {
            var lengthFieldName;
            if (typeof lengthFunc == "string") {
                lengthFieldName = lengthFunc;
                lengthFunc = function(reader) {
                    return reader.getFieldValue(lengthFieldName);
                };
            }
            return new Field(name, -1, function(reader) {
                var length = parseInt(lengthFunc(reader), 10),
                    size = length * arrayType.BYTES_PER_ELEMENT;
                reader.setSize(size);
                if (length > 0) {
                    return new arrayType(reader.buffer, reader.offset, length);
                } else {
                    return [];
                }
            });
        };
    }

    // Field definitions

    Struct.int8 = _MakeTyped(Int8Array, "getInt8");
    Struct.int8Array = _MakeTypedArray(Int8Array, "getInt8");
    Struct.int8VariableArray = _MakeTypedVariableArray(Int8Array, "getInt8");
    Struct.uint8 = _MakeTyped(Uint8Array, "getUint8");
    Struct.uint8Array = _MakeTypedArray(Uint8Array, "getUint8");
    Struct.uint8VariableArray = _MakeTypedVariableArray(Uint8Array, "getUint8");

    Struct.int16 = _MakeTyped(Int16Array, "getInt16");
    Struct.int16Array = _MakeTypedArray(Int16Array, "getInt16");
    Struct.int16VariableArray = _MakeTypedVariableArray(Int16Array, "getInt16");
    Struct.uint16 = _MakeTyped(Uint16Array, "getUint16");
    Struct.uint16Array = _MakeTypedArray(Uint16Array, "getUint16");
    Struct.uint16VariableArray = _MakeTypedVariableArray(Uint16Array, "getUint16");

    Struct.int32 = _MakeTyped(Int32Array, "getInt32");
    Struct.int32Array = _MakeTypedArray(Int32Array, "getInt32");
    Struct.int32VariableArray = _MakeTypedVariableArray(Int32Array, "getInt32");
    Struct.uint32 = _MakeTyped(Uint32Array, "getUint32");
    Struct.uint32Array = _MakeTypedArray(Uint32Array, "getUint32");
    Struct.uint32VariableArray = _MakeTypedVariableArray(Uint32Array, "getUint32");

    Struct.float32 = _MakeTyped(Float32Array, "getFloat32");
    Struct.float32Array = _MakeTypedArray(Float32Array, "getFloat32");
    Struct.float32VariableArray = _MakeTypedVariableArray(Float32Array, "getFloat32");

    Struct.asciiString = function(name, length) {
        return new Field(name, length * Uint8Array.BYTES_PER_ELEMENT, function(reader) {
            return String.fromCharCode.apply(null, new Uint8Array(reader.buffer, reader.offset, length));
        });
    };

    Struct.asciiZString = function(name) {
        return new Field(name, -1, function(reader) {
            var bytes = new Uint8Array(reader.buffer, reader.offset);
            var i,
                length = bytes.length,
                maxLength = bytes.length;
            for (i = 0; i < maxLength; i++) {
                if (bytes[i] > 0) {
                    // Nothing special; but this is the normal case
                } else {
                    length = i;
                    break;
                }
            }
            reader.setSize(length + 1);
            if (length > 0) {
                return String.fromCharCode.apply(null, bytes.subarray(0, length));
            } else {
                return "";
            }
        });
    };

    Struct.struct = function(name, struct) {
        return new Field(name, struct.size, function(reader) {
            var obj = struct.read(reader.buffer, reader.offset, reader);
            reader.setSize(obj.size);
            return obj;
        });
    };

    Struct.structArray = function(name, struct, length) {
        var size = (struct.size == -1) ? -1 : length * struct.size;
        return new Field(name, size, function(reader) {
            var i,
                objs = [],
                obj,
                size = 0;
            for (i = 0; i < length; i++) {
                obj = struct.read(reader.buffer, reader.offset + size, reader);
                objs.push(obj);
                size += obj.size;
            }
            reader.setSize(size);
            return objs;
        });
    };

    Struct.structVariableArray = function(name, struct, lengthFunc) {
        var lengthFieldName;
        if (typeof lengthFunc == "string") {
            lengthFieldName = lengthFunc;
            lengthFunc = function(reader) {
                return reader.getFieldValue(lengthFieldName);
            };
        }
        return new Field(name, -1, function(reader) {
            var length = parseInt(lengthFunc(reader), 10),
                i,
                objs = [],
                obj,
                size = 0;
            for (i = 0; i < length; i++) {
                obj = struct.read(reader.buffer, reader.offset + size, reader);
                objs.push(obj);
                size += obj.size;
            }
            reader.setSize(size);
            return objs;
        });
    };

    return {
        Field: Field,
        ConditionalFields: ConditionalFields,
        Struct: Struct
    };
});
