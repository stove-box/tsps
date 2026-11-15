"use strict";

/**
 * The Boss list: a server-defined widget group (docs/agents/interfaces.md) in the main modal, as large as the fixed
 * viewport allows. A search box over a grid of the destinations, four to a row, each with its boss's icon beside
 * its name. The shared custom-interface runtime scrolls and filters the grid client-side and sends a clicked
 * destination's row id back as the click's slot.
 */
const { FLAG_OP1, TYPE_GRAPHIC, TYPE_RECTANGLE, TYPE_TEXT, createWidgetGroup } = require("../../interface/widgetGroup");

const GROUP_ID = 30017;
const MAIN_MODAL_UID = (161 << 16) | 16;
const COMPONENT = {
  ROOT: 0, FRAME: 1, SEARCH_BOX: 2, SEARCH_INPUT: 3, STATUS: 4, DATA: 5, LIST_VIEW: 6, LIST_SCROLLBAR: 7,
  ROW_BACKGROUND_START: 10, ROW_ICON_START: 60, ROW_LABEL_START: 110,
};
const WIDTH = 494;
const HEIGHT = 316;
const COLUMNS = 4;
const ROW_HEIGHT = 32;
const LIST = { x: 14, y: 60, width: 448, height: 244 };
const COLUMN_WIDTH = LIST.width / COLUMNS;
/** One row more than shows at once, so a part-scrolled grid has no gap. */
const ROW_SLOTS = COLUMNS * (Math.ceil(LIST.height / ROW_HEIGHT) + 1);
/** An item icon's 36x32, scaled to the row. */
const ICON = { width: 31, height: 28 };
const uid = (component) => (GROUP_ID << 16) | component;

const text = (x, y, width, height, overrides = {}) => ({
  type: TYPE_TEXT, rawX: x, rawY: y, rawWidth: width, rawHeight: height, width, height,
  text: "", fontId: 494, textColor: 0xe8ded0, textShadowed: true, ...overrides,
});
const box = (x, y, width, height, overrides = {}) => ({
  type: TYPE_RECTANGLE, rawX: x, rawY: y, rawWidth: width, rawHeight: height, width, height,
  filled: true, color: 0x211b16, opacity: 32, ...overrides,
});

function addSearch(add, root) {
  add(COMPONENT.SEARCH_BOX, root, box(LIST.x, 34, 300, 20, { color: 0x2b241b, mouseOverColor: 0x3a3125, actions: ["Search"], flags: FLAG_OP1 }));
  add(COMPONENT.SEARCH_INPUT, root, text(LIST.x + 6, 34, 288, 20, { yTextAlignment: 1, actions: ["Search"], flags: FLAG_OP1 }));
  add(COMPONENT.STATUS, root, text(LIST.x + 308, 34, LIST.width + 16 - 308, 20, { textColor: 0xffd27f, xTextAlignment: 2, yTextAlignment: 1 }));
  add(COMPONENT.DATA, root, { type: TYPE_TEXT, hidden: true, isHidden: true });
}

function addGrid(add, root) {
  const list = add(COMPONENT.LIST_VIEW, root, {
    rawX: LIST.x, rawY: LIST.y, rawWidth: LIST.width, rawHeight: LIST.height,
    width: LIST.width, height: LIST.height, scrollWidth: LIST.width, scrollHeight: LIST.height,
  });
  add(COMPONENT.LIST_SCROLLBAR, root, {
    rawX: LIST.x + LIST.width, rawY: LIST.y, rawWidth: 16, rawHeight: LIST.height, width: 16, height: LIST.height, noClickThrough: true,
  });
  for (let slot = 0; slot < ROW_SLOTS; slot++) {
    const x = (slot % COLUMNS) * COLUMN_WIDTH;
    add(COMPONENT.ROW_BACKGROUND_START + slot, list, box(x + 1, 0, COLUMN_WIDTH - 2, ROW_HEIGHT - 2, { mouseOverColor: 0x3a3125 }));
    add(COMPONENT.ROW_ICON_START + slot, list, {
      type: TYPE_GRAPHIC, rawX: x + 3, rawY: 0, rawWidth: ICON.width, rawHeight: ICON.height, width: ICON.width, height: ICON.height, itemQuantityMode: 0,
    });
    add(COMPONENT.ROW_LABEL_START + slot, list, text(x + ICON.width + 6, 0, COLUMN_WIDTH - ICON.width - 9, ROW_HEIGHT - 2, {
      yTextAlignment: 1, actions: ["Teleport"], flags: FLAG_OP1,
    }));
  }
}

function buildInterface() {
  const { widgets, add } = createWidgetGroup(GROUP_ID);
  const root = add(COMPONENT.ROOT, -1, {
    rawWidth: 18, rawHeight: 18, widthMode: 1, heightMode: 1,
    width: WIDTH, height: HEIGHT, xPositionMode: 1, yPositionMode: 1,
  });
  add(COMPONENT.FRAME, root, { widthMode: 1, heightMode: 1, width: WIDTH, height: HEIGHT });
  addSearch(add, root);
  addGrid(add, root);
  return {
    groupId: GROUP_ID, widgets,
    search: {
      inputComponent: COMPONENT.SEARCH_INPUT, backgroundComponent: COMPONENT.SEARCH_BOX, dataComponent: COMPONENT.DATA,
      maxLength: 30, placeholder: "<col=8f7f66>Search bosses...</col>", caret: "|", textTemplate: "%s",
      focusColor: 0x3a3125, blurColor: 0x2b241b,
    },
    list: {
      viewComponent: COMPONENT.LIST_VIEW, scrollbarComponent: COMPONENT.LIST_SCROLLBAR,
      slotCount: ROW_SLOTS, columns: COLUMNS, rowHeight: ROW_HEIGHT,
      backgroundStart: COMPONENT.ROW_BACKGROUND_START, iconStart: COMPONENT.ROW_ICON_START, iconBaseY: 1,
      labelStart: COMPONENT.ROW_LABEL_START, itemLabel: "%name", clickable: true,
    },
    status: { component: COMPONENT.STATUS, matches: "%shown of %total", empty: "No matching bosses." },
  };
}

module.exports = { GROUP_ID, MAIN_MODAL_UID, COMPONENT, ROW_SLOTS, uid, buildInterface };
