"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var fs_1 = require("fs");
var path_1 = require("path");
var child_process_1 = require("child_process");
var __dirname = import.meta.dirname;
var versions = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../configs/versions.config.json'), 'utf-8'));
var start = function () { return __awaiter(void 0, void 0, void 0, function () {
    var hasMismatch, _i, _a, packageName, installedVersion, currentPackageJson, execOptions;
    return __generator(this, function (_b) {
        hasMismatch = false;
        for (_i = 0, _a = Object.keys(versions); _i < _a.length; _i++) {
            packageName = _a[_i];
            installedVersion = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, "../node_modules/".concat(packageName, "/package.json")), 'utf-8')).version;
            if (installedVersion !== versions[packageName]) {
                hasMismatch = true;
                versions[packageName] = installedVersion;
            }
        }
        if (!hasMismatch) {
            console.log('(publisher) No mismatch found on packages, exiting...');
            return [2 /*return*/];
        }
        console.log('(publisher) Mismatch found on packages, publishing...');
        currentPackageJson = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../package.json'), 'utf-8'));
        currentPackageJson.version = currentPackageJson.version
            .split('.')
            .map(function (v, i) { return (i === 2 ? parseInt(v) + 1 : v); })
            .join('.');
        fs_1.default.writeFileSync(path_1.default.join(__dirname, '../package.json'), JSON.stringify(currentPackageJson, null, 2));
        execOptions = {
            cwd: path_1.default.join(__dirname, '..'),
            stdio: 'inherit',
        };
        (0, child_process_1.execSync)('npm publish --access restricted', execOptions);
        fs_1.default.writeFileSync(path_1.default.join(__dirname, '../configs/versions.config.json'), JSON.stringify(versions, null, 2));
        (0, child_process_1.execSync)('git add .', execOptions);
        (0, child_process_1.execSync)('git commit -m "(bot) automated build - update to @btc-vision/btc-runtime^' +
            versions['@btc-vision/btc-runtime'] +
            '"', execOptions);
        (0, child_process_1.execSync)('git push -f origin main', execOptions);
        console.log('(publisher) Packges published and pushed to git');
        console.log('(publisher) New version: ' + currentPackageJson.version);
        console.log('(publisher) Webworker CDN: https://cdn.jsdelivr.net/gh/bitapeslabs/opnet-build/dist/webworker-bundle/opnetBuilder.js');
        return [2 /*return*/];
    });
}); };
start();
