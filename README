structose - structured binary data reading in javascript
========================================================

structose is a quick and dirty library for declaring binary data structures and reading them from an ArrayBuffer, MIT-licenced. I apologise for its haphazard design; it was built to work with a particularly convoluted set of data structures that I was working with at the time. Pull requests are very welcome!

Everything is little-endian. Aligned reads of integers or floats will return typed arrays; unaligned reads will return ordinary arrays.


Example
-------

A three-element vector:

    var Struct = structose.Struct;
    var Vector3 = new Struct([
        Struct.float32("x"),
        Struct.float32("y"),
        Struct.float32("z")
    ]);
    console.log("A Vector3 requires " + Vector3.size + " bytes.");

    var velocity = Vector3.read(buffer, 0);
    console.log(velocity.x, velocity.y, velocity.z);

Some fixed-length arrays:

    var Struct = structose.Struct;
    var ArrayExamples = new Struct([
        Struct.uint8Array("rgba", 4),
        Struct.float32Array("matrix", 16),
        Struct.asciiString("name", 12)
    ]);
    console.log("ArrayExamples struct requires " + ArrayExamples.size + " bytes.");

    var examples = ArrayExamples.read(buffer, 0);
    console.log("red: " + examples.rgba[0] + " green: " + examples.rgba[1] + " blue: " + examples.rgba[2] + " alpha: " + examples.rgba[3]);
    console.log("matrix: " + examples.matrix);
    console.log("name: " + examples.name);

And variable-length arrays:

    var Struct = structose.Struct;
    var Graph = new Struct([
        Struct.asciiZString("name"),
        Struct.uint32("count"),
        Struct.float32VariableArray("yValues", "count")
    ]);
    // Graph.size == -1, to indicate an unknown size

    var graph = Graph.read(buffer, 0);
    console.log("Graph size read was: " + graph.size);
    console.log("Graph " + graph.name + " has " + graph.count + " y values.");
    console.log(graph.yValues);

You get the idea.

