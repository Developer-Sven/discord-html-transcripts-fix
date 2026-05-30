"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportReturnType = exports.AttachmentTypes = void 0;
var AttachmentTypes;
(function (AttachmentTypes) {
    AttachmentTypes[AttachmentTypes["Audio"] = 0] = "Audio";
    AttachmentTypes[AttachmentTypes["Video"] = 1] = "Video";
    AttachmentTypes[AttachmentTypes["Image"] = 2] = "Image";
    AttachmentTypes[AttachmentTypes["File"] = 3] = "File";
})(AttachmentTypes || (exports.AttachmentTypes = AttachmentTypes = {}));
var ExportReturnType;
(function (ExportReturnType) {
    ExportReturnType["Buffer"] = "buffer";
    ExportReturnType["String"] = "string";
    ExportReturnType["Attachment"] = "attachment";
    ExportReturnType["Stream"] = "stream";
})(ExportReturnType || (exports.ExportReturnType = ExportReturnType = {}));
//# sourceMappingURL=types.js.map