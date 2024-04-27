import { columnHeader, getColumnIndexMap, Row } from './spreadsheet'
import { Message, sendPushMessage, sendReplyMessage } from './line'

export const main = () => {
  console.log('🐛 debug : テスト')
}

/**
 * WebhookからのPOSTリクエストを処理する
 * @param e
 */
export const doPost = (e: any) => {
  const EVENTS = JSON.parse(e.postData.contents).events
  for (const event of EVENTS) {
    execute(event)
  }
}

/**
 * イベントを処理する
 * @param event
 */
const execute = (event: any) => {
  const EVENT_TYPE = event.type
  const REPLY_TOKEN = event.replyToken
  const USER_ID = event.source.userId

  if (EVENT_TYPE === 'message') {
    if (event.message.type === 'text') {
      // タスク追加の呼び出しを行う
      const text = event.message.text
      // 「登録」で始まるメッセージの場合、リマインドメッセージを登録する
      // スプレッドシートを開く
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet2 = activeSpreadsheet.getSheetByName('シート2');
    if (!sheet2) {
      sendError(REPLY_TOKEN, 'Sheet not found');
      return; // シートが見つからない場合はエラー送信して終了
    }

    // 列のインデックスを取得
    const columnIndexMap = getColumnIndexMap(sheet2);

    // シート2の同じuser_idの最後の行のchat_statusを取得する
    const rows = sheet2.getDataRange().getValues();
    let lastStatus = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i][columnIndexMap.user_id] === USER_ID) {
        lastStatus = rows[i][columnIndexMap.status].toString();
        break;
      }
    }

    // タスク追加のキーワードがある場合にadd_tasksを実行
    if (text.match(/^タスクを追加/) ) {
      add_tasks(text, REPLY_TOKEN, USER_ID);
    } 
    //タスクを確認が押されたとき確認が押されたときcheck_tasksを実行
    else if (text.match(/^タスクを確認/) ) {
      check_tasks(text, REPLY_TOKEN, USER_ID);
    } 
    // 最後のステータスが1の場合または最後のステータスが3の場合にadd_tagsを実行
    else if (lastStatus === "1" || lastStatus === "3" && (lastStatus !== "6")) {
      add_tags(text, REPLY_TOKEN, USER_ID);
    } 
    // 最後のステータスが2の場合にsave_tagsを実行
    else if (lastStatus === "2") {
      save_tags(text, REPLY_TOKEN, USER_ID);
    } 
    else if (lastStatus === "4") {
      show_tags(text, REPLY_TOKEN, USER_ID);
    } 
    else if (lastStatus === "5") {
      edit_tags(text, REPLY_TOKEN, USER_ID);
    } 
    // 上記のいずれでもない場合はエラーを送信
    else {
      sendError(REPLY_TOKEN, 'Invalid action or condition');
    }
  }
}
}

// エラーを送信する関数
function sendError(replyToken: string, errorMessage: string) {
  const message = {
    type: 'text',
    text: errorMessage
  };
  sendReplyMessage(replyToken, [message]);
}


// 以下タスク追加のロジック
const save_tags = (text: string, replyToken: string, userId: string): void => {

  const chat_status = 3
  const chat_tags = text

  
  // スプレッドシートを開く
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet2 = activeSpreadsheet.getSheetByName('シート2');
  const sheet3 = activeSpreadsheet.getSheetByName('シート3');
  if (!sheet2 || !sheet3) {
    throw new Error('sheet not found');
  }

  // 列のインデックスを取得
  const columnIndexMap = getColumnIndexMap(sheet2);

  // シート2から条件に合うtask_contentを検索する
  const rows = sheet2.getDataRange().getValues(); // シート2の全データを取得
  let lastTaskContent = ""; // 最後尾のtask_contentを保持する変数
  for (let i = rows.length - 1; i >= 0; i--) { // 逆順にループして最新の行を探す
    const row = rows[i];
    if (row[columnIndexMap.user_id] === userId && Number(row[columnIndexMap.status]) === 2) {
      lastTaskContent = row[columnIndexMap.task_content];
      break;
    }
  }

  // 新しい行を作成してシート2に書き込む
  const newRow = Array.from({ length: columnHeader.length }, () => '');
  newRow[columnIndexMap.user_id] = userId;
  newRow[columnIndexMap.status] = chat_status.toString();
  newRow[columnIndexMap.tags] = chat_tags;
  newRow[columnIndexMap.task_content] = lastTaskContent;
  sheet2.appendRow(newRow);

  // 作成した行をシート3にもコピー
  sheet3.appendRow(newRow);


  const messages = [
    {
      type: 'text',
      text: 'タグ「'+text+'」タスク「'+ lastTaskContent +'」で登録しました',
    },
  ]
  sendReplyMessage(replyToken, messages)
}

const add_tasks = (text: string, replyToken: string, userId: string): void => {

  const chat_status = 1
  const chat_tags = ""
  const task_content = ""

    // スプレッドシートを開く
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet()
    const sheet = activeSpreadsheet.getSheetByName('シート2')
    if (!sheet) {
      throw new Error('sheet not found')
    }
  
    // 列のインデックスを取得
    const columnIndexMap = getColumnIndexMap(sheet)
    // 新しい行を作成して書き込む
    const newRow: Row = Array.from({ length: columnHeader.length }, () => '')
    newRow[columnIndexMap.user_id] = userId
    newRow[columnIndexMap.status] = chat_status.toString()
    newRow[columnIndexMap.tags] = chat_tags
    newRow[columnIndexMap.task_content] = task_content
  
    sheet.appendRow(newRow)

  const messages = [
    {
      type: 'text',
      text: 'タスク内容を入力してください',
    },
  ]
  sendReplyMessage(replyToken, messages)
}

const add_tags = (text: string, replyToken: string, userId: string): void => {

  const chat_status = 2
  const chat_tags = ""
  const task_content = text

  
  // スプレッドシートを開く
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = activeSpreadsheet.getSheetByName('シート2')
  if (!sheet) {
    throw new Error('sheet not found')
  }

  // 列のインデックスを取得
  const columnIndexMap = getColumnIndexMap(sheet)
// 新しい行を作成して書き込む
    const newRow: Row = Array.from({ length: columnHeader.length }, () => '')
    newRow[columnIndexMap.user_id] = userId
    newRow[columnIndexMap.status] = chat_status.toString()
    newRow[columnIndexMap.tags] = chat_tags
    newRow[columnIndexMap.task_content] = task_content
    sheet.appendRow(newRow)

  // タグの生成
  const message = [
    {
      "type": "text", // 1
      "text": "追加するタスクのタグを選択してください。",
      "quickReply": { // 2
        "items": [
          {
            "type": "action", // 3
            "action": {
              "type": "message",
              "label": "AIにおまかせ",
              "text": "AIにおまかせ"
            }
          },
          {
            "type": "action", 
            "action": {
              "type": "message",
              "label": "仕事",
              "text": "仕事"
            }
          },
          {
            "type": "action",
            "action": {
              "type": "message",
              "label": "家事",
              "text": "家事"
            }
          },
          {
            "type": "action",
            "action": {
              "type": "message",
              "label": "タグを新しく追加",
              "text": "タグを新しく追加"
            }
          },
        ]
      }
    }
    
  ]
  sendReplyMessage(replyToken, message)
}



// 以下タスク確認のロジック
const check_tasks = (text: string, replyToken: string, userId: string): void => {
  
  const chat_status = 4
  const chat_tags = ""
  const task_content = ""

  
  // スプレッドシートを開く
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = activeSpreadsheet.getSheetByName('シート2')
  if (!sheet) {
    throw new Error('sheet not found')
  }

  // 列のインデックスを取得
  const columnIndexMap = getColumnIndexMap(sheet)
// 新しい行を作成して書き込む
    const newRow: Row = Array.from({ length: columnHeader.length }, () => '')
    newRow[columnIndexMap.user_id] = userId
    newRow[columnIndexMap.status] = chat_status.toString()
    newRow[columnIndexMap.tags] = chat_tags
    newRow[columnIndexMap.task_content] = task_content
    sheet.appendRow(newRow)

  const messages = [
    {
      type: 'text',
      text: '確認するタスクのタグを選択してください。',
      "quickReply": { // 2
        "items": [
          {
            "type": "action", 
            "action": {
              "type": "message",
              "label": "仕事",
              "text": "仕事"
            }
          },
          {
            "type": "action",
            "action": {
              "type": "message",
              "label": "家事",
              "text": "家事"
            }
          },
        ]
      }
    },
  ]
  sendReplyMessage(replyToken, messages)

}
//確認でタグを表示。要修正
const show_tags = (text: string, replyToken: string, userId: string): void => {

  const chat_status = 5
  const chat_tags = ""

  
  // スプレッドシートを開く
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet3 = activeSpreadsheet.getSheetByName('シート2');
  if (!sheet3) {
    throw new Error('sheet not found');
  }

  // 列のインデックスを取得
  const columnIndexMap = getColumnIndexMap(sheet3);

  // シート2から条件に合うtask_contentを検索する
  const rows = sheet3.getDataRange().getValues(); // シート2の全データを取得
  let lastTaskContent = ""; // 最後尾のtask_contentを保持する変数
  for (let i = rows.length - 1; i >= 0; i--) { // 逆順にループして最新の行を探す
    const row = rows[i];
    if (row[columnIndexMap.user_id] === userId && Number(row[columnIndexMap.status]) === 2) {
      lastTaskContent = row[columnIndexMap.task_content];
      break;
    }
  }

  // 新しい行を作成してシート2に書き込む
  const newRow = Array.from({ length: columnHeader.length }, () => '');
  newRow[columnIndexMap.user_id] = userId;
  newRow[columnIndexMap.status] = chat_status.toString();
  newRow[columnIndexMap.tags] = chat_tags;
  newRow[columnIndexMap.task_content] = "";
  sheet3.appendRow(newRow);

  const messages = [
    {
      type: 'text',
      text: 'ここでフレックスメッセージを使用。',
      }
  ]
  sendReplyMessage(replyToken, messages)
}

// タグの編集画面.要修正
const edit_tags = (text: string, replyToken: string, userId: string): void => {

  const chat_status = 6
  const chat_tags = ""
  const task_content = ""

  
  // スプレッドシートを開く
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = activeSpreadsheet.getSheetByName('シート2')
  if (!sheet) {
    throw new Error('sheet not found')
  }

  // 列のインデックスを取得
  const columnIndexMap = getColumnIndexMap(sheet)
// 新しい行を作成して書き込む
    const newRow: Row = Array.from({ length: columnHeader.length }, () => '')
    newRow[columnIndexMap.user_id] = userId
    newRow[columnIndexMap.status] = chat_status.toString()
    newRow[columnIndexMap.tags] = chat_tags
    newRow[columnIndexMap.task_content] = task_content
    sheet.appendRow(newRow)

  // タグの編集
  const message = [
    {
      "type": "text", // 1
      "text": "追加するタスクのタグを選択してください。",
      "quickReply": { // 2
        "items": [
          {
            "type": "action", // 3
            "action": {
              "type": "message",
              "label": "AIにおまかせ",
              "text": "AIにおまかせ"
            }
          },
          {
            "type": "action", 
            "action": {
              "type": "message",
              "label": "仕事",
              "text": "仕事"
            }
          },
          {
            "type": "action",
            "action": {
              "type": "message",
              "label": "家事",
              "text": "家事"
            }
          },
          {
            "type": "action",
            "action": {
              "type": "message",
              "label": "タグを新しく追加",
              "text": "タグを新しく追加"
            }
          },
        ]
      }
    }
    
  ]
  sendReplyMessage(replyToken, message)
}



/**
 * リマインドメッセージを送信する
 */
export const remind = () => {
  // // スプレッドシートを開く
  // const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  // const sheet = activeSpreadsheet.getSheetByName('シート1')
  // if (!sheet) {
  //   throw new Error('sheet not found')
  // }

  // // 列のインデックスを取得
  // const columnIndexMap = getColumnIndexMap(sheet)

  // // 今日の日付を取得
  // const today = new Date()
  // const todayMonth = today.getMonth() + 1
  // const todayDate = today.getDate()

  // // データを取得して、今日の日付のデータを抽出する
  // const rows = sheet.getDataRange().getValues()
  // type UserId = string
  // // ユーザーごとにメッセージをまとめる
  // const userMessagesMap = rows.reduce<Record<UserId, Message[]>>(
  //   (acc: Record<UserId, Message[]>, row: Row) => {
  //     const rowDate = row[columnIndexMap.date]
  //     const rowDateObj = new Date(rowDate)
  //     // 今日の日付のデータの場合、メッセージを格納する
  //     if (
  //       rowDateObj.getMonth() + 1 === todayMonth &&
  //       rowDateObj.getDate() === todayDate
  //     ) {
  //       // 既に同じユーザーに対するメッセージの配列がある場合、メッセージを追加する
  //       if (acc[row[columnIndexMap.user_id]]) {
  //         acc[row[columnIndexMap.user_id]].push({
  //           type: 'text',
  //           text: row[columnIndexMap.message],
  //         })
  //       } else {
  //         // まだ同じユーザーに対するメッセージの配列がない場合、新しくメッセージの配列を作成する
  //         acc[row[columnIndexMap.user_id]] = [
  //           {
  //             type: 'text',
  //             text: row[columnIndexMap.message],
  //           },
  //         ]
  //       }
  //     }
  //     return acc
  //   },
  //   {} as Record<UserId, Message[]>
  // )

  // // ユーザーごとにメッセージを送信する
  // for (const userId in userMessagesMap) {
  //   const messages = userMessagesMap[userId]
  //   sendPushMessage(userId, messages)
  // }
}