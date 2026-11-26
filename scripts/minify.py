#!/usr/bin/env python3
"""Safe state-machine CSS and JS minifier with syntax validation for static site assets."""
import pathlib
import subprocess

def minify_css(src: str) -> str:
    out = []
    i, n = 0, len(src)
    in_str = None
    paren_depth = 0
    while i < n:
        c = src[i]
        if in_str:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c in ("'", '"'):
            in_str = c
            out.append(c)
            i += 1
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            end = src.find("*/", i + 2)
            i = n if end == -1 else end + 2
            continue
        if c == "(":
            paren_depth += 1
            out.append(c)
            i += 1
            continue
        if c == ")":
            paren_depth = max(0, paren_depth - 1)
            out.append(c)
            i += 1
            continue
        if c.isspace():
            while i + 1 < n and src[i + 1].isspace():
                i += 1
            prev = out[-1] if out else ""
            nxt = src[i + 1] if i + 1 < n else ""
            if paren_depth > 0:
                if prev in ("(", ",") or nxt in (")", ","):
                    i += 1
                    continue
                out.append(" ")
            elif prev in ("", "{", "}", ";", ":", ",", ">", "+") or nxt in ("", "{", "}", ";", ",", ">"):
                pass
            else:
                out.append(" ")
            i += 1
            continue
        if c == ";" and i + 1 < n:
            j = i + 1
            while j < n and src[j].isspace():
                j += 1
            if j < n and src[j] == "}":
                i += 1
                continue
        out.append(c)
        i += 1
    return "".join(out).strip()

_RE_PREV_ALLOW = set("(=,:!&|?{};+*-~^%<>")
_ID_CHARS = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$")

def minify_js(src: str) -> str:
    """Lossless JS minifier preserving strings, template literals, regex literals, and ASI newlines."""
    out = []
    i, n = 0, len(src)
    last_tok = ""
    last_word = ""

    def peek_prev_nonspace():
        for k in range(len(out) - 1, -1, -1):
            s = out[k].rstrip()
            if s:
                return s[-1]
        return ""

    while i < n:
        c = src[i]
        # Line comment
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            nl = src.find("\n", i + 2)
            i = n if nl == -1 else nl
            continue
        # Block comment
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            end = src.find("*/", i + 2)
            i = n if end == -1 else end + 2
            continue
        # Single/double quoted strings
        if c in ("'", '"'):
            q = c
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == q:
                    j += 1
                    break
                j += 1
            tok = src[i:j]
            out.append(tok)
            last_tok = q
            last_word = ""
            i = j
            continue
        # Template literals (preserving ${...} and inner newlines verbatim)
        if c == "`":
            j = i + 1
            depth = 0
            while j < n:
                ch = src[j]
                if ch == "\\":
                    j += 2
                    continue
                if ch == "$" and j + 1 < n and src[j + 1] == "{":
                    depth += 1
                    j += 2
                    continue
                if depth > 0:
                    if ch in ("'", '"'):
                        q = ch
                        j += 1
                        while j < n:
                            if src[j] == "\\":
                                j += 2
                                continue
                            if src[j] == q:
                                j += 1
                                break
                            j += 1
                        continue
                    if ch == "{":
                        depth += 1
                    elif ch == "}":
                        depth -= 1
                    j += 1
                    continue
                if ch == "`":
                    j += 1
                    break
                j += 1
            out.append(src[i:j])
            last_tok = "`"
            last_word = ""
            i = j
            continue
        # Regex literal heuristic: `/` after operator, keyword (return/throw/case/else/in/of/typeof/void/delete/new/await/yield), or start
        if c == "/" and (last_tok in _RE_PREV_ALLOW or last_tok == "" or last_word in (
            "return", "throw", "case", "else", "in", "of", "typeof", "void", "delete", "new", "await", "yield"
        )):
            j = i + 1
            in_class = False
            while j < n:
                ch = src[j]
                if ch == "\\":
                    j += 2
                    continue
                if ch == "[":
                    in_class = True
                elif ch == "]" and in_class:
                    in_class = False
                elif ch == "/" and not in_class:
                    j += 1
                    while j < n and src[j].isalpha():
                        j += 1
                    break
                elif ch == "\n":
                    break
                j += 1
            out.append(src[i:j])
            last_tok = "/"
            last_word = ""
            i = j
            continue
        # Whitespace collapsing (preserve single newline when previous token could trigger ASI, or space between identifiers)
        if c.isspace():
            has_nl = False
            while i < n and src[i].isspace():
                if src[i] == "\n":
                    has_nl = True
                i += 1
            nxt = src[i] if i < n else ""
            prev = peek_prev_nonspace()
            if not prev or not nxt:
                continue
            if has_nl and prev not in _RE_PREV_ALLOW.union({"["}) and nxt not in set(").,;]}?:"):
                out.append("\n")
            elif (prev in _ID_CHARS and nxt in _ID_CHARS) or (prev == nxt and prev in "+-"):
                out.append(" ")
            continue
        # Identifier / token tracking
        if c in _ID_CHARS:
            j = i
            while j < n and src[j] in _ID_CHARS:
                j += 1
            word = src[i:j]
            out.append(word)
            last_tok = word[-1]
            last_word = word
            i = j
            continue
        out.append(c)
        last_tok = c
        last_word = ""
        i += 1
    return "".join(out)

def build_minified_assets(root: pathlib.Path) -> None:
    for css in ("home.css", "pages.css", "invest.css", "admin.css"):
        p = root / css
        if p.exists():
            m = minify_css(p.read_text())
            (root / css.replace(".css", ".min.css")).write_text(m)
    for js in ("home.js", "invest.js", "admin.js"):
        p = root / js
        if p.exists():
            m = minify_js(p.read_text())
            mp = root / js.replace(".js", ".min.js")
            mp.write_text(m)
            subprocess.run(["node", "--check", str(mp)], check=True)
