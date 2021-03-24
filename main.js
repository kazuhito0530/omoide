/* jshint curly:true, debug:true */
/* globals $, firebase */




const downloadhobbyImage = (hobbyImageLocation) => 
  firebase
    .storage()
    .ref(hobbyImageLocation)
    .getDownloadURL() 
    .catch((error) => {
      console.error('写真のダウンロードに失敗:', error);
    });


const displayhobbyImage = ($divTag, url) => {
  $divTag.find('.hobby-item__image').attr({
    src: url,
  });
};


const deletehobby = (hobbyId) => {

  
  console.log(`${hobbyId}を削除しました`);
  firebase
    .database()
    .ref(`hobbys/${hobbyId}`)
    .remove();
};


const createhobbyDiv = (hobbyId, hobbyData) => {
  const $divTag = $('#hobby-template > .hobby-item').clone();
  $divTag.find('.hobby-item__title').text(hobbyData.hobbyTitle);
  downloadhobbyImage(hobbyData.hobbyImageLocation).then((url) => {
    displayhobbyImage($divTag, url);
  });

  $divTag.attr('id', `hobby-id-${hobbyId}`);

  const $deleteButton = $divTag.find('.hobby-item__delete');
  $deleteButton.on('click', () => {
    deletehobby(hobbyId);
  });

  return $divTag;
};

const resetshelfView = () => {
  $('#hobby-list').empty();
};

const addhobby = (hobbyId, hobbyData) => {
  const $divTag = createhobbyDiv(hobbyId, hobbyData);
  $divTag.appendTo('#hobby-list');
};

const loadshelfView = () => {
  resetshelfView();

  const hobbysRef = firebase
    .database()
    .ref('hobbys')
    .orderByChild('createdAt');

  hobbysRef.off('child_removed');
  hobbysRef.off('child_added');

  hobbysRef.on('child_removed', (hobbySnapshot) => {
    const hobbyId = hobbySnapshot.key;
    const $hobby = $(`#hobby-id-${hobbyId}`);
    console.log(hobbyId);
    $hobby.remove();
  });

  hobbysRef.on('child_added', (hobbySnapshot) => {
    const hobbyId = hobbySnapshot.key;
    const hobbyData = hobbySnapshot.val();

    addhobby(hobbyId, hobbyData);
  });                                                                                                                           
};

/**
 * ----------------------
 * すべての画面共通で使う関数
 * ----------------------
 */

// ビュー（画面）を変更する
const showView = (id) => {
  $('.view').hide();
  $(`#${id}`).fadeIn();

  if (id === 'shelf') {
    loadshelfView();
  }
};

/**
 * -------------------------
 * ログイン・ログアウト関連の関数
 * -------------------------
 */


const resetLoginForm = () => {
  $('#login__help').hide();
  $('#login__submit-button')
    .prop('disabled', false)
    .text('ログイン');
};


const onLogin = () => {
  console.log('ログイン完了');
  
  showView('shelf');
};

const onLogout = () => {
  const hobbysRef = firebase.database().ref('hobbys');

  hobbysRef.off('child_removed');
  hobbysRef.off('child_added');

  showView('shelf');
};

/**
 * ------------------
 * イベントハンドラの登録
 * ------------------
 */

// ログイン状態の変化を監視する
firebase.auth().onAuthStateChanged((user) => {
  // ログイン状態が変化した
  if (user) {
    // ログイン済
    onLogin();
  } else {
    // 未ログイン
    onLogout();
  }
});

// ログインフォームが送信されたらログインする
$('#login-form').on('submit', (e) => {
  e.preventDefault();

  const $loginButton = $('#login__submit-button');
  $loginButton.text('送信中…');

  const email = $('#login-email').val();
  const password = $('#login-password').val();

  // ログインを試みる
  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      // ログインに成功したときの処理
      console.log('ログインしました。');

      // ログインフォームを初期状態に戻す
      resetLoginForm();
    })
    .catch((error) => {
      // ログインに失敗したときの処理
      console.error('ログインエラー', error);

      $('#login__help')
        .text('ログインに失敗しました。')
        .show();

      // ログインボタンを元に戻す
      $loginButton.text('ログイン');
    });
});

// ログアウトボタンが押されたらログアウトする
$('.logout-button').on('click', () => {
  firebase
    .auth()
    .signOut()
    .catch((error) => {
      console.error('ログアウトに失敗:', error);
    });
});

/**
 * -------------------------
 * 書籍情報追加モーダル関連の処理
 * -------------------------
 */

const resetAddhobbyModal = () => {
  $('#hobby-form')[0].reset();
  $('#add-hobby-image-label').text('');
  $('#submit_add_hobby')
    .prop('disabled', false)
    .text('保存');
};

$('#add-hobby-image').on('change', (e) => {
  const input = e.target;
  const $label = $('#add-hobby-image-label');
  const file = input.files[0];

  if (file != null) {
    $label.text(file.name);
  } else {
    $label.text('写真を選択');
  }
});

$('#hobby-form').on('submit', (e) => {
  e.preventDefault();

  $('#submit_add_hobby')
    .prop('disabled', true)
    .text('送信中');

  const hobbyTitle = $('#add-hobby-title').val();

  const $hobbyImage = $('#add-hobby-image');
  const { files } = $hobbyImage[0];

  if (files.length === 0) {

    return;
  }

  const file = files[0]; // 表紙画像ファイル
  const filename = file.name; // 画像ファイル名
  const hobbyImageLocation = `hobby-images/${filename}`; // 画像ファイルのアップロード先

  firebase
    .storage()
    .ref(hobbyImageLocation)
    .put(file) // Storageへファイルアップロードを実行
    .then(() => {
      // Storageへのアップロードに成功したら、Realtime Databaseにデータを保存する
      const hobbyData = {
        hobbyTitle,
        hobbyImageLocation,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
      };
      return firebase
        .database()
        .ref('hobbys')
        .push(hobbyData);
    })
    .then(() => {
      $('#add-hobby-modal').modal('hide');
      resetAddhobbyModal();
    })
    .catch((error) => {
      // 失敗したとき
      console.error('エラー', error);
      resetAddhobbyModal();
      $('#add-hobby__help')
        .text('保存できませんでした')
        .fadeIn();
    });
});

showView('shelf');
