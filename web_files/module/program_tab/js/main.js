// UTF8 without BOM

/*
    Program Tab
*/

// settings vars and functions
var prog =
{
    db: {},
    
    module_dir: "web_files/module/program_tab/",
    
    current_line: 0,
    file: "",
    pages: 0,
    last_page_id: 0,
    
    page_lines: 1000,
    syntax_highlight: true,
    
    last_scroll_pos: 0,
    max_scroll_offset: 2000
};

// have we a localStorage?
if ( window.localStorage ) prog.db = window.localStorage;




prog.simpleClickAnimation = function ( id )
{
    document.querySelector("#"+id).style.opacity = "0";
    setTimeout( 'document.querySelector("#'+id+'").style.opacity = "1";', 200 );
}




// some of the move buttons was clicked
prog.btn_clicked = function ( event )
{
    var id;

    if ( /_(file|program)$/.test(event.target.id) ) id = event.target.id;
    else if ( /_(file|program)$/.test(event.target.parentElement.id) ) id = event.target.parentElement.id;
    else return;

    prog.simpleClickAnimation(id);

    switch (id) {
        case "open_file": 
            tabs.activate("explorer");
            log.add("[PROG] Opening files explorer");
            break;
        case "reload_file": 
            if ( prog.file ) prog.load_file(prog.file);
            else log.add("[PROG] Nothing to reload");
            break;

        case "play_program": 
            log.add("[PROG] Run current program");
/*            if ( !ctrl.machine_on || ctrl.machine_estop || ctrl.program_status == "running" ) break;
            if ( ctrl.program_status == "paused" ) {
                ctrl.exec("set resume\r\n");
            } else {
                if ( typeof(prog) != "object" ) ctrl.exec("set mode auto\r\nset run\r\n");
                else ctrl.exec("set mode auto\r\nset run " + prog.current_line + "\r\n");
            }
*/            break;
        case "pause_program": 
            log.add("[PROG] Pause current program");
/*            if ( !ctrl.machine_on || ctrl.machine_estop || ctrl.program_status == "idle" ) break;
            if ( ctrl.program_status == "running" ) ctrl.exec("set pause\r\n");
            else ctrl.exec("set resume\r\n");
*/            break;
        case "step_program": 
            log.add("[PROG] Run one line of current program");
            break;
        case "abort_program": 
            log.add("[PROG] Abort current program");
/*            if ( !ctrl.machine_on || ctrl.machine_estop ) break;
            ctrl.exec("set abort\r\n");
*/            break;
    }
}




prog.editor_update = function(event)
{
    var text        = typeof(prog.text_node) == "undefined" ? document.querySelector("#program_text") : prog.text_node;
    var line        = typeof(prog.line_node) == "undefined" ? document.querySelector("#current_line") : prog.line_node;
    var position    = typeof(prog.position_node) == "undefined" ? document.querySelector("#current_pos") : prog.position_node;

    var current_pos     = text.selectionDirection == "forward" ? text.selectionStart : text.selectionEnd;
    var current_line    = (text.value.substr(0,current_pos).match(/\n/gm) || []).length + 1;

    prog.current_line = current_line;

    position.innerHTML  = "" + current_pos; 
    line.innerHTML      = "" + current_line; 
}




prog.editor_goto_line = function ( number, select )
{
    number      = Number(number).toFixed(0);
    var text    = typeof(prog.text_node) == "undefined" ? document.querySelector("#program_text") : prog.text_node;
    var lines   = text.value.match(/[^\n]*\n/gm);

    if ( !lines || number <= 1 ) {
        if ( select ) text.setSelectionRange(0, text.value.search(/(\n|$)/), "forward");
        return;
    } else if ( number > (lines.length + 1) ) {
        text.setSelectionRange( text.value.search(/\n[^\n]*$/) + 1, text.value.length, "forward" );
        text.scrollTop = text.scrollHeight;
        text.scrollLeft = 0;
        return;
    }

    var startPos = 0;
    for ( var n = 0, max = number - 1; n < max; n++ ) startPos += lines[n].length;
    
    var endPos = select ? startPos + lines[number - 1].length - 1 : startPos;
    var line_height = text.scrollHeight / (lines.length + 1);

    text.setSelectionRange(startPos, endPos, "forward");
    text.scrollTop = line_height * (number - 1) - text.clientHeight/2;
    text.scrollLeft = 0;
    
    prog.editor_update();
}




prog.load_file = function ( file_path )
{
    var text_box = document.querySelector("#program_text");

    text_box.innerHTML  = "";

    prog.file           = file_path;
    prog.current_line   = 0;
    prog.pages          = 0;

    loadto(
        "web_files/module/program_tab/php/get_file_lines.php?file="+prog.file+"&start="+0+"&count="+prog.page_lines, "a", 
        prog.add_page(0, "", 0, prog.page_lines),
        function() {
            log.add("[PROG] File `"+prog.file+"` loaded");
        }
    );
}

prog.add_page = function ( id, text, start_line, lines )
{
    var text_box = document.querySelector("#program_text");
    var page = document.createElement("DIV");

    page.className = "page";
    page.setAttribute("data-page_id", id);
    page.setAttribute("data-start_line", start_line);
    page.setAttribute("data-lines", lines);

    text_box.appendChild(page);

    prog.pages++;

    return page;
}




prog.on_scroll = function ( event )
{
    // when scroll bar almost at the top
    if ( 
        prog.last_scroll_pos >= prog.max_scroll_offset && 
        this.scrollTop < prog.max_scroll_offset 
    ) {
        var top_page_id = prog.top_visible_page_id();
        if ( top_page_id > 0 ) 
        {
            var prev_page_id = top_page_id - 1;
            if ( prog.page_loaded(prev_page_id) ) 
            {
                if ( !prog.page_visible(prev_page_id) ) prog.show_page(prev_page_id);

                var bottom_page_id = prog.bottom_visible_page_id();
                if ( (bottom_page_id - top_page_id) > 1 ) // if we have more than 2 visible pages
                { 
                    if ( prog.page_visible(bottom_page_id) ) prog.hide_page(bottom_page_id);
                }
            }
        }
    } 
    // when scroll bar almost at the bottom
    else if ( 
        prog.last_scroll_pos <= (this.scrollHeight - prog.max_scroll_offset) &&
        this.scrollBottom > (this.scrollHeight - prog.max_scroll_offset) 
    ) {
        
    }
    
    prog.last_scroll_pos = this.scrollTop;
}




prog.top_visible_page_id = function ( )
{
    var page = prog.text_box.querySelector("not(.page.hidden)");
    return ( page ) ? page.getAttribute("data-page_id"); : 0;
}
prog.bottom_visible_page_id = function ( )
{
    var page = prog.text_box.querySelector(".page");
    return ( page ) ? page.getAttribute("data-page_id"); : 0;
}
prog.page_loaded = function ( page_id )
{
    var page = prog.text_box.querySelector("[data-page_id="+page_id+"]");
    return ( page ) ? true : false;
}
prog.page_visible = function ( page_id )
{
    var page = prog.text_box.querySelector("not(.page.hidden)[data-page_id="+page_id+"]");
    return ( page ) ? true : false;
}
prog.page_hidden = function ( page_id )
{
    var page = prog.text_box.querySelector(".page.hidden[data-page_id="+page_id+"]");
    return ( page ) ? true : false;
}
prog.load_page = function ( page_id )
{
    if ( page_id < 0 || (prog.last_page_id && page_id > prog.last_page_id) ) return;
    
    var page = document.createElement("DIV");

    page.className = "page";
    page.setAttribute("data-page_id", page_id);
    page.setAttribute("data-start_line", page_id * prog.page_lines);
    page.setAttribute("data-lines", prog.page_lines);

    prog.text_box.appendChild(page);

    loadto(
        prog.module_dir+
            "php/get_file_lines.php?file="+prog.file+
            "&start="+(page_id * prog.page_lines)+
            "&count="+prog.page_lines, 
        "a", 
        page
    );
}
prog.show_page = function ( page_id )
{
    var page = prog.text_box.querySelector("[data-page_id="+page_id+"]");
    if ( page ) page.classList.remove("hidden");
}
prog.hide_page = function ( page_id )
{
    var page = prog.text_box.querySelector("[data-page_id="+page_id+"]");
    if ( page ) page.classList.add("hidden");
}



// do it when window is fully loaded
prog.js_init = function()
{
    console.log("prog.js_init()");

    if ( typeof(tabs) != "object" ) {
        log.add("[PROG] Tabs panel not found");
        return;
    }
    
    // create TMP element
    prog.tab_content = document.createElement("div");
    prog.tab_content.style.display = "none";
    document.querySelector("body").appendChild(prog.tab_content);
    
    // and load into it tab's content
    loadto("web_files/module/program_tab/html/program_tab.html", "a", prog.tab_content, 
        function() {
            prog.tab = tabs.add("&#x2009;Program&#x2009;", prog.tab_content.innerHTML, "program,file,editor", 0, true);
            document.querySelector("body").removeChild(prog.tab_content);
            // catch btns clicks
            document.querySelector("#program_tools").addEventListener("click", prog.btn_clicked );
            document.querySelector("#program_text").addEventListener("scroll", prog.on_scroll );
//            document.querySelector("#program_text").addEventListener("click", prog.editor_update );
//            document.querySelector("#program_text").addEventListener("keyup", prog.editor_update );
            prog.text_box = document.querySelector("#program_text");
            lng.update();
        }
    );
}




window.addEventListener( "DOMContentLoaded", prog.js_init );
