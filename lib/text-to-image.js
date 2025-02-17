"use strict";

var fs = require("fs"),
  path = require("path"),
  Promise = require("bluebird"),
  Canvas = require("canvas"),
  _ = require("lodash"),
  defaults = {
    debug: false,
    maxWidth: 400,
    fontSize: 18,
    lineHeight: 28,
    margin: 10,
    bgColor: "#fff",
    textColor: "#000",
    fontFamily: "Helvetica",
    fontWeight: "normal",
    leftMargin: 120,
    fileName: `${new Date().toISOString().replace(/[\W\.]/g, "")}.jpeg`,
    customHeight: 0
  };

function generateImage(content, config) {
  var conf = _.defaults(config, defaults);

  var textData = createTextData(
    content,
    conf.maxWidth - conf.margin,
    conf.fontSize,
    conf.lineHeight,
    conf.bgColor,
    conf.textColor,
    conf.fontFamily,
    conf.fontWeight,
    conf.leftMargin,
    conf.customHeight
  );

  // use Canvas.createCanvas instead of constructor (new Canvas)
  // https://github.com/Automattic/node-canvas/issues/997
  var canvas = Canvas.createCanvas(
      conf.maxWidth,
      textData.height + conf.margin * 2
    ),
    ctx = canvas.getContext("2d");

  ctx.globalAlpha = 1;
  ctx.fillStyle = conf.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.putImageData(textData, conf.margin, conf.margin);

  var dataUrl = canvas.toDataURL();

  if (conf.debug) {
    return new Promise(function(resolve, reject) {
      var pngStream = canvas.createPNGStream();
      var out = fs.createWriteStream(path.join(process.cwd(), conf.fileName));
      out.on("close", function() {
        resolve(dataUrl);
      });
      pngStream.pipe(out);
    });
  }

  return Promise.resolve(dataUrl);
}

function createTextData(
  text,
  maxWidth,
  fontSize,
  lineHeight,
  bgColor,
  textColor,
  fontFamily,
  fontWeight,
  leftMargin,
  customHeight
) {
  // create a tall context so we definitely can fit all text

  // use Canvas.createCanvas instead of constructor (new Canvas)
  // https://github.com/Automattic/node-canvas/issues/997
  var textCanvas = Canvas.createCanvas(maxWidth, 1000);
  var textContext = textCanvas.getContext("2d");
  var textX = leftMargin || 0;
  var textY = 0;

  // make background the color passed in
  textContext.fillStyle = bgColor;
  textContext.fillRect(0, 0, textCanvas.width, textCanvas.height);

  // make text
  textContext.fillStyle = textColor;
  textContext.font = fontWeight + " " + fontSize + "px " + fontFamily;
  textContext.textBaseline = "top";

  // split the text into words
  var words = text.split(" "),
    wordCount = words.length;

  // the start of the first line
  var line = "",
    addNewLines = [];

  for (var n = 0; n < wordCount; n++) {
    var word = words[n];

    if (/\n/.test(words[n])) {
      var parts = words[n].split("\n");
      // use the first word before the newline(s)
      word = parts.shift();
      // mark the next word as beginning with newline
      addNewLines.push(n + 1);
      // return the rest of the parts to the words array at the same index
      words.splice(n + 1, 0, parts.join("\n"));
      wordCount += 1;
    }

    // append one word to the line and see
    // if its width exceeds the maxWidth
    var testLine = line + word + " ";
    var testLineWidth = textContext.measureText(testLine).width;

    // if the line is marked as starting with a newline
    // OR if the line is too long, add a newline
    if (addNewLines.indexOf(n) > -1 || (testLineWidth > maxWidth && n > 0)) {
      // if the line exceeded the width with one additional word
      // just paint the line without the word
      textContext.fillText(line, textX, textY);

      // start a new line with the last word
      // and add the following (if this word was a newline word)
      line = word + " ";

      // move the pen down
      textY += lineHeight;
    } else {
      // if not exceeded, just continue
      line = testLine;
    }
  }
  // paint the last line
  textContext.fillText(line, textX, textY);

  var textImgHeight = customHeight || textY + lineHeight;

  return textContext.getImageData(0, 0, maxWidth, textImgHeight);
}

module.exports = {
  generate: generateImage
};
