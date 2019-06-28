'use strict';
import TabPanel from './ui/tab.js';
import Paginator from './ui/paginator.js';
import Storage from './storage.js';


const PAGE_SIZE = 50;


/**
 * Class Modal
 */
class Modal {
    constructor(selector) {
        this.modal = document.querySelector(selector);
    }

    static get instance() {
        if (!this._instance) {
            let instance = this._instance = new this();
            instance.modal.querySelector('.modal-close')
                .addEventListener('click', () => this.close());
        }
        return this._instance;
    }

    static show() {
        this.instance.modal.classList.add('is-active');
    }

    static close() {
        let instance = this.instance;
        instance.modal.classList.remove('is-active');
    }
}


/**
 * Class PictureModal
 */
class PictureModal extends Modal {
    constructor() {
        super('#picture-modal');
    }

    static show(src) {
        this.instance.modal.querySelector('.image>img').setAttribute('src', src);
        super.show();
    }
}


/**
 * Class MinorModal
 */
class MinorModal extends Modal {
    constructor() {
        super('#minor-modal');
    }
}


/**
 * Class Panel
 */
class Panel {
    clear() {
        this.container.innerHTML = '';
    }

    async load(total) {
        throw new Error('Not implemented');
    }

    constructor(container, page, pageSize) {
        this.container = container;
        this.page = page;
        this.pageSize = pageSize;
        this.userId = parseInt(location.search.substr(1));
        this.clear();
        $(container).on(
            'click',
            '.image.preview>img',
            event => PictureModal.show(event.currentTarget.dataset.src)
        );
    }

    get storage() {
        return new Storage(this.userId);
    }

    paging() {
        let page = this.page;
        let total = this.total;
        let pageSize = this.pageSize;
        let panel = this;

        let paginator = new Paginator(page, Math.ceil(total / pageSize));
        paginator.addEventListener('change', async event => {
            panel.clear();
            paginator.currentPage = panel.page = event.target.currentPage;
            await panel.load(total);
            paginator.load();
            paginator.appendTo(panel.container);
        })
        paginator.appendTo(panel.container);
    }

    static async render(tab, page = 1, pageSize = PAGE_SIZE) {
        const PANEL_CLASSES = {
            status: Status,
            interest: Interest,
            review: Review,
            note: Note,
            photo: PhotoAlbum,
            follow: Follow,
            doumail: Doumail,
            doulist: Doulist,
        };
        let name = tab.getAttribute('name');
        let panel = new (PANEL_CLASSES[name])(tab, page, pageSize);
        panel.total = await panel.load();
        panel.paging();
    }
}


/**
 * Class SegmentsPanel
 */
class SegmentsPanel extends Panel {
    onToggle($target) {
        throw new Error('Not implemented');
    }

    constructor(container, page, pageSize) {
        let segments = container.querySelector('.segments.tabs');
        container = container.querySelector('.sub-container');
        super(container, page, pageSize);
        this.segments = segments;
        let $segmentLinks = $(this.segments).find('ul>li a');
        $segmentLinks.parent().removeClass('is-active');
        this.segments.querySelector('ul>li').classList.add('is-active');
        $segmentLinks.off('click');
        $segmentLinks.on('click', async event => {
            let $target = $(event.currentTarget);
            $segmentLinks.parent().removeClass('is-active');
            $target.parent().addClass('is-active');
            this.onToggle($target);
            this.clear();
            this.total = await this.load();
            this.paging();
        });
    }
}


const TEMPLATE_STATUS = `\
<article class="media status">
  <figure class="media-left">
    <p class="image is-64x64 avatar"><img></p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <strong class="author name"></strong> <small class="author uid"></small> <span class="activity"></span>
        <br><small class="created"></small>
      </p>
      <p class="text"></p>
    </div>
    <div class="columns is-1 is-multiline images"></div>
    <div class="media box card is-hidden">
      <figure class="media-left">
        <p class="image"><img></p>
      </figure>
      <div class="media-content">
        <div class="content">
          <p class="title is-size-6"><a></a></p>
          <p class="subtitle is-size-7"></p>
        </div>
      </div>
    </div>
    <div class="box content topic is-hidden">
      <p>
        话题：<a class="topic-title" target="_blank" title="前往豆瓣查看"></a>
        <small class="topic-subtitle"></small>
      </p>
    </div>
    <div class="level stat">
      <div class="level-left">
        <div class="level-item">
          <span class="icon">
            <i class="far fa-thumbs-up"></i>
          </span>
          <small class="likes"></small>
        </div>
        <div class="level-item">
          <span class="icon">
            <i class="fas fa-retweet"></i>
          </span>
          <small class="reshares"></small>
        </div>
        <div class="level-item">
          <span class="icon">
            <i class="far fa-comment-alt"></i>
          </span>
          <small class="comments"></small>
        </div>
      </div>
      <div class="level-right">
        <div class="level-item">
          <a class="status-url" target="_blank" title="前往豆瓣查看">
            <span class="icon">
              <i class="fas fa-external-link-alt"></i>
            </span>
          </a>
        </div>
      </div>
    </div>
  </div>
</article>`;


/**
 * Class Status
 */
class Status extends Panel {
    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let collection = await storage.local.status
            .orderBy('id').reverse()
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .toArray();
        if (!total) {
            total = await storage.local.status.count();
        }
        storage.local.close();
        for (let {status, comments} of collection) {
            let $status = $(TEMPLATE_STATUS);
            $status.find('.avatar>img').attr('src', status.author.avatar);
            $status.find('.author.name').text(status.author.name);
            $status.find('.author.uid').text('@' + status.author.uid);
            $status.find('.activity').text(status.activity + "：");
            $status.find('.created').text(status.create_time);
            $status.find('.text').text(status.text);
            $status.find('.status-url').attr('href', status.sharing_url);
            let $images = $status.find('.images');
            status.images.forEach(image => {
                $images.append(`\
<div class="column is-one-third">
  <figure class="image preview is-128x128">
    <img src="${image.normal.url}" data-src="${image.large.url}">
  </figure>
</div>`
                );
            });
            $status.find('.likes').text(status.like_count);
            $status.find('.reshares').text(status.reshares_count);
            $status.find('.comments').text(status.comments_count);
            if (status.card) {
                let $card = $status.find('.card');
                let card = status.card;
                $card.removeClass('is-hidden');
                if (card.card_style == 'obsolete') {
                    $card.find('.subtitle').text(card.obsolete_msg);
                } else {
                    if (card.image) {
                        $card.find('.image>img').attr('src', card.image.normal.url);
                    }
                    let $title = $card.find('.title>a');
                    $title.text(card.title);
                    $title.attr('href', card.url);
                    $card.find('.subtitle').text(card.subtitle);
                }
            }
            if (status.topic) {
                let $topic = $status.find('.topic');
                let topic = status.topic;
                $topic.find('.topic-title').text(topic.title).attr('href', topic.url);
                $topic.find('.topic-subtitle').text(topic.card_subtitle);
                $topic.removeClass('is-hidden');
            }
            $status.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_INTEREST = `\
<article class="media subject">
  <figure class="media-left">
    <p class="image subject-cover">
      <a class="subject-url" target="_blank" title="前往豆瓣查看"><img></a>
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <a class="subject-url title is-size-5" target="_blank" title="前往豆瓣查看"></a>
        <span class="rating">
          <label><span class="rating-count"></span>人评价</label>
          <label>豆瓣评分：<span class="rating-value is-size-4 has-text-danger"></span></label>
        </span>
      </p>
      <p class="subtitle is-size-6"></p>
    </div>
    <div class="box content my-rating">
      <p>
        <small class="create-time"></small>
        <small>标签：<span class="my-tags"></span></small><br>
        <span class="my-comment"></span>
      </p>
    </div>
  </div>
</article>`;


/**
 * Class Interest
 */
class Interest extends SegmentsPanel {
    onToggle($target) {
        this.type = $target.data('type');
        this.status = $target.data('status');
    }

    constructor(container, page, pageSize) {
        super(container, page, pageSize);
        this.type = 'movie';
        this.status = 'done';
    }

    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'interest',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let version = versionInfo.version;
        let collection = await storage.local.interest
            .where({ version: version, type: this.type, status: this.status })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.interest
                .where({ version: version, type: this.type, status: this.status })
                .count();
        }
        storage.local.close();
        for (let {interest} of collection) {
            let $interest = $(TEMPLATE_INTEREST);
            let subject = interest.subject;
            $interest.find('.subject-cover img').attr('src', subject.pic.normal);
            $interest.find('.title').text(subject.title);
            $interest.find('.subject-url').attr('href', subject.url);
            if (interest.subject.null_rating_reason) {
                $interest.find('.rating').text(subject.null_rating_reason);
            } else {
                $interest.find('.rating-value').text(subject.rating.value.toFixed(1));
                $interest.find('.rating-count').text(subject.rating.count);
            }
            $interest.find('.subtitle').text(subject.card_subtitle);
            $interest.find('.create-time').text(interest.create_time);
            $interest.find('.my-comment').text(interest.comment);
            $interest.find('.my-tags').text(interest.tags);
            $interest.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_REVIEW = `\
<article class="media subject">
  <figure class="media-left">
    <p class="image subject-cover">
      <a class="subject-url" target="_blank" title="前往豆瓣查看"><img></a>
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <a class="subject-url title is-size-5" target="_blank" title="前往豆瓣查看"></a>
        <span class="rating">
          <label><span class="rating-count"></span>人评价</label>
          <label>豆瓣评分：<span class="rating-value is-size-4 has-text-danger"></span></label>
        </span>
      </p>
      <p class="subtitle is-size-6"></p>
    </div>
    <div class="box content review">
      <p>
        <a class="review-title review-url is-size-5" target="_blank"></a>
        <small>我的评分：<span class="my-rating is-size-5 has-text-danger"></span></small><br>
        <small class="create-time"></small>
        <span class="tag is-normal useful"></span>
        <span class="tag is-normal useless"></span>
        <span class="tag is-normal comments"></span>
        <span class="tag is-normal reads"></span>
      </p>
      <p class="abstract"></p>
    </div>
  </div>
</article>`;


/**
 * Class Review
 */
class Review extends SegmentsPanel {
    async showReview(reviewId, version) {
        let storage = this.storage;
        storage.local.open();
        let { review } = await storage.local.review.get({
            id: reviewId,
            version: version,
        });
        storage.local.close();
        let container = MinorModal.instance.modal.querySelector('.box');
        container.innerHTML = '';
        let $article = $(TEMPLATE_ARTICLE);
        $article.find('.title').text(review.title);
        $article.find('.content').html(review.fulltext);
        $article.appendTo(container);
        MinorModal.show();
    }

    onToggle($target) {
        this.type = $target.data('type');
    }

    constructor(container, page, pageSize) {
        super(container, page, pageSize);
        this.type = 'movie';
    }

    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'review',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let version = versionInfo.version;
        let collection = await storage.local.review
            .where({ version: version, type: this.type })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.review
                .where({ version: version, type: this.type })
                .count();
        }
        storage.local.close();
        for (let {id, review} of collection) {
            let $review = $(TEMPLATE_REVIEW);
            $review.find('.subject-cover img').attr('src', review.subject.pic.normal);
            $review.find('.subject-url').attr('href', review.subject.url);
            $review.find('.title').text(review.subject.title);
            $review.find('.review-title').text(review.title).click(async event => {
                event.preventDefault();
                await this.showReview(id, version);
                return false;
            });
            $review.find('.review-url').attr('href', review.url);
            $review.find('.subtitle').text(review.subject.card_subtitle);
            if (review.subject.null_rating_reason) {
                $review.find('.rating').text(review.subject.null_rating_reason);
            } else {
                $review.find('.rating-value').text(review.subject.rating.value.toFixed(1));
                $review.find('.rating-count').text(review.subject.rating.count);
            }
            $review.find('.create-time').text(review.create_time);
            if (review.rating) {
                $review.find('.my-rating').text(review.rating.value);
            } else {
                $review.find('.my-rating').parent().addClass('is-hidden');
            }
            $review.find('.useful').text('有用 ' + review.useful_count);
            $review.find('.useless').text('没用 ' + review.useless_count);
            $review.find('.comments').text(review.comments_count + ' 回应');
            $review.find('.reads').text(review.read_count + ' 阅读');
            $review.find('.abstract').text(review.abstract);
            $review.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_NOTE = `\
<article class="media note">
  <div class="media-content">
    <div class="content">
      <p>
        <a class="title is-size-5" target="_blank"></a>
        <br>
        <small class="create-time"></small>
        <span class="tag is-normal comments"></span>
        <span class="tag is-normal reads"></span>
      </p>
      <p class="abstract"></p>
    </div>
  </div>
  <figure class="media-right is-hidden">
    <p class="image cover">
      <img>
    </p>
  </figure>
</article>`;


const TEMPLATE_ARTICLE = `\
<div class="content article">
    <h1 class="title"></h1>
    <div class="content"></div>
</div>`;


/**
 * Class Note
 */
class Note extends Panel {
    async showNote(noteId, version) {
        let storage = this.storage;
        storage.local.open();
        let { note } = await storage.local.note.get({
            id: noteId,
            version: version,
        });
        storage.local.close();
        let container = MinorModal.instance.modal.querySelector('.box');
        container.innerHTML = '';
        let $article = $(TEMPLATE_ARTICLE);
        $article.find('.title').text(note.title);
        $article.find('.content').html(note.fulltext);
        $article.appendTo(container);
        MinorModal.show();
    }

    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'note',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let version = versionInfo.version;
        let collection = await storage.local.note
            .where({ version: version })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.note
                .where({ version: version })
                .count();
        }
        storage.local.close();
        for (let {id, note} of collection) {
            let $note = $(TEMPLATE_NOTE);
            $note.find('.title').text(note.title).attr('href', note.url).click(async event => {
                event.preventDefault();
                await this.showNote(id, version);
                return false;
            });
            $note.find('.create-time').text(note.create_time);
            note.cover_url && $note.find('.media-right .image>img')
                .attr('src', note.cover_url)
                .parents('.media-right').removeClass('is-hidden');
            $note.find('.comments').text(note.comments_count + ' 回应');
            $note.find('.reads').text(note.read_count + ' 阅读');
            $note.find('.abstract').text(note.abstract);
            $note.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_COLUMNS = '<div class="columns is-multiline"></div>';
const TEMPLATE_ALBUM = `\
<div class="column album is-one-quarter">
  <figure class="image is-fullwidth" style="margin-bottom: 0.5rem;">
    <a class="album-url"><img></a>
  </figure>
  <p class="has-text-centered">
    <a class="album-url title is-size-6 has-text-weight-normal"></a>
    (<small class="total"></small>)<br>
    <small class="create-time"></small>
  </p>
  <p class="subtitle is-size-7 description"></p>
</div>`;
const TEMPLATE_PHOTO = `\
<div class="column photo is-one-quarter">
  <figure class="image is-fullwidth is-square" style="margin-bottom: 0.5rem;">
    <a class="album-url"><img></a>
  </figure>
  <p class="subtitle is-size-7 description"></p>
</div>`;

/**
 * Class PhotoAlbum
 */
class PhotoAlbum extends Panel {
    async showAlbum(albumId) {
        let container = MinorModal.instance.modal.querySelector('.box');
        let panel = new Photo(container, 1, PAGE_SIZE);
        MinorModal.show();
        panel.album = albumId;
        panel.total = await panel.load();
        panel.paging();
    }

    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let collection = await storage.local.album
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.album.count();
        }
        storage.local.close();
        let $albums = $(TEMPLATE_COLUMNS);
        for (let {id, album} of collection) {
            let $album = $(TEMPLATE_ALBUM);
            $album.find('.image img').attr('src', album.cover_url);
            $album.find('.title').text(album.title);
            $album.find('.total').text(album.photos_count);
            $album.find('.description').text(album.description);
            $album.find('.create-time').text(album.create_time);
            $album.find('.album-url').attr('href', album.url).click(async event => {
                event.preventDefault();
                await this.showAlbum(id);
                return false;
            });
            $album.appendTo($albums);
        }
        $albums.appendTo(this.container);
        return total;
    }
}


/**
 * Class Photo
 */
class Photo extends Panel {
    async load(total) {
        let albumId = this.album;
        let storage = this.storage;
        storage.local.open();
        let collection = await storage.local.photo
            .where({album: albumId})
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.photo
                .where({album: albumId})
                .count();
        }
        storage.local.close();
        let $photos = $(TEMPLATE_COLUMNS);
        for (let photo of collection) {
            let $photo = $(TEMPLATE_PHOTO);
            $photo.find('.image img').attr('src', photo.cover).click(() => {
                PictureModal.show(photo.cover.replace('/m/','/l/'));
            });
            $photo.find('.description').text(photo.description);
            $photo.appendTo($photos);
            
        }
        $photos.appendTo(this.container);
        return total;
    }
}


const TEMPLATE_USER_INFO = `\
<article class="media user">
  <figure class="media-left">
    <p class="image is-64x64 avatar">
      <a class="user-url" target="_blank" title="前往豆瓣查看"><img></a>
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <a class="user-url" target="_blank" title="前往豆瓣查看"><strong class="username"></strong></a>
        <small class="user-symbol"></small>
        <small class="is-hidden">(<span class="remark"></span>)</small>
        <small class="is-hidden"><br>常居：<span class="loc"></span></small>
        <small class="is-hidden"><br>签名：<span class="signature"></span></small>
        <br>
        <small class="is-hidden">被 <span class="followers"></span> 人关注</small>
        <small class="is-hidden">关注 <span class="following"></span> 人</small>
        <small class="followed is-hidden">已关注</small>
      </p>
    </div>
    <div class="columns user-data"></div>
  </div>
</article>`;


/**
 * Class Following
 */
class Following extends Panel {
    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'following',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let version = versionInfo.version;
        let collection = await storage.local.following.where({ version: version })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .toArray();
        if (!total) {
            total = await storage.local.following.where({ version: version }).count();
        }
        storage.local.close();

        for (let {user} of collection) {
            let $userInfo = $(TEMPLATE_USER_INFO);
            $userInfo.find('.avatar img').attr('src', user.avatar);
            $userInfo.find('.user-url').attr('href', user.url);
            $userInfo.find('.username').text(user.name);
            $userInfo.find('.user-symbol').text('@' + user.uid);
            user.following_count && $userInfo.find('.following').text(user.following_count).parent().removeClass('is-hidden');
            user.followers_count && $userInfo.find('.followers').text(user.followers_count).parent().removeClass('is-hidden');
            user.loc && $userInfo.find('.loc').text(user.loc.name).parent().removeClass('is-hidden');
            user.remark && $userInfo.find('.remark').text(user.remark).parent().removeClass('is-hidden');
            user.signature && $userInfo.find('.signature').text(user.signature).parent().removeClass('is-hidden');
            $userInfo.appendTo(this.container);
        }

        return total;
    }
}


/**
 * Class Follower
 */
class Follower extends Panel {
    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'follower',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let version = versionInfo.version;
        let collection = await storage.local.follower.where({ version: version })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .toArray();
        if (!total) {
            total = await storage.local.follower.where({ version: version }).count();
        }
        storage.local.close();

        for (let {user} of collection) {
            let $userInfo = $(TEMPLATE_USER_INFO);
            $userInfo.find('.avatar img').attr('src', user.avatar);
            $userInfo.find('.user-url').attr('href', user.url);
            $userInfo.find('.username').text(user.name);
            $userInfo.find('.user-symbol').text('@' + user.uid);
            user.loc && $userInfo.find('.loc').text(user.loc.name).parent().removeClass('is-hidden');
            user.following_count && $userInfo.find('.following').text(user.following_count).parent().removeClass('is-hidden');
            user.followers_count && $userInfo.find('.followers').text(user.followers_count).parent().removeClass('is-hidden');
            user.signature && $userInfo.find('.signature').text(user.signature).parent().removeClass('is-hidden');
            $userInfo.appendTo(this.container);
        }

        return total;
    }
}


/**
 * Class Blacklist
 */
class Blacklist extends Panel {
    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'blacklist',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let version = versionInfo.version;
        let collection = await storage.local.blacklist.where({ version: version })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .toArray();
        if (!total) {
            total = await storage.local.blacklist.where({ version: version }).count();
        }
        storage.local.close();

        for (let {user} of collection) {
            let $userInfo = $(TEMPLATE_USER_INFO);
            $userInfo.find('.avatar img').attr('src', user.avatar);
            $userInfo.find('.user-url').attr('href', user.url);
            $userInfo.find('.username').text(user.name);
            $userInfo.find('.user-symbol').text('@' + user.uid);
            $userInfo.appendTo(this.container);
        }

        return total;
    }
}


/**
 * Class Follow
 */
class Follow extends SegmentsPanel {
    onToggle($target) {
        switch ($target.data('type')) {
            case 'following':
                this.target = new Following(this.container, this.page, this.pageSize);
                break;
            case 'follower':
                this.target = new Follower(this.container, this.page, this.pageSize);
                break;
            case 'blacklist':
                this.target = new Blacklist(this.container, this.page, this.pageSize);
                break;
        }
    }

    constructor(container, page, pageSize) {
        super(container, page, pageSize);
        this.target = new Following(this.container, page, pageSize);
    }

    async load(total) {
        return await this.target.load(total);
    }
}


const TEMPLATE_DOUMAIL_CONTACT = `\
<article class="media contact">
  <figure class="media-left">
    <p class="image is-48x48 avatar">
      <a class="doumail-url" target="_blank" title="前往豆瓣查看"><img></a>
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <a class="doumail-url username" target="_blank"></a>
        <br>
        <span class="abstract"></span>
      </p>
    </div>
    <div class="columns user-data"></div>
  </div>
  <div class="media-right">
    <span class="time"></span>
  </div>
</article>`;


/**
 * Class Doumail
 */
class Doumail extends Panel {
    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let collection = await storage.local.doumailContact
            .orderBy('rank').reverse()
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .toArray();
        if (!total) {
            total = await storage.local.doumailContact.count();
        }
        storage.local.close();
        for (let {contact, abstract, time, url} of collection) {
            let $contact = $(TEMPLATE_DOUMAIL_CONTACT);
            contact.avatar && $contact.find('.avatar img').attr('src', contact.avatar);
            $contact.find('.doumail-url').attr('href', url);
            $contact.find('.username').text(contact.name);
            $contact.find('.abstract').text(abstract);
            $contact.find('.time').text(time);
            $contact.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_DOULIST = `\
<article class="media doulist">
  <figure class="media-left">
    <p class="image cover">
      <img>
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <a class="title is-size-6" target="_blank"></a>
        <span class="is-private icon is-hidden">
          <i class="fas fa-lock"></i>
        </span>
        <small>(<span class="items-count"></span>)</small><br>
        <small>作者：<a class="author" target="_blank"></a></small>
        <small>创建于 <span class="create-time"></span></small>
        <small>更新于 <span class="update-time"></span></small><br>
        <small>标签：<span class="doulist-tags"></span></small>
        <small>分类：<span class="category"></span></small>
      </p>
      <p class="description is-size-7"></p>
    </div>
  </div>
</article>`;

/**
 * Class Doulist
 */
class Doulist extends SegmentsPanel {
    onToggle($target) {
        this.type = $target.data('type');
    }

    constructor(container, page, pageSize) {
        super(container, page, pageSize);
        this.type = 'owned';
    }

    async showDoulist(doulistId) {
        let container = MinorModal.instance.modal.querySelector('.box');
        let panel = new DoulistItem(container, 1, PAGE_SIZE);
        MinorModal.show();
        panel.doulist = doulistId;
        panel.total = await panel.load();
        panel.paging();
    }

    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let collection = await storage.local.doulist
            .where({ type: this.type })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.doulist
                .where({ type: this.type })
                .count();
        }
        storage.local.close();
        for (let {id, doulist} of collection) {
            let $doulist = $(TEMPLATE_DOULIST);
            $doulist.find('.cover img').attr('src', doulist.cover_url);
            $doulist.find('.title').text(doulist.title).attr('href', doulist.url).click(async event => {
                event.preventDefault();
                await this.showDoulist(id);
                return false;
            });
            $doulist.find('.author').text(doulist.owner.name).attr('href', doulist.owner.url);
            $doulist.find('.create-time').text(doulist.create_time);
            doulist.is_private && $doulist.find('.is-private').removeClass('is-hidden');
            $doulist.find('.update-time').text(doulist.update_time);
            $doulist.find('.doulist-tags').text(doulist.tags);
            $doulist.find('.items-count').text(doulist.items_count);
            $doulist.find('.description').text(doulist.desc);
            $doulist.find('.category').text(doulist.category);
            $doulist.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_DOULIST_ITEM = `\
<article class="media doulist-item">
  <figure class="media-left is-hidden">
    <p class="image picture">
      <img>
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <a class="title is-size-6" target="_blank"></a>
        <small>来源：<span class="source"></span></small>
      </p>
      <p class="abstract is-size-7"></p>
    </div>
  </div>
</article>`;

/**
 * Class DoulistItem
 */
class DoulistItem extends Panel {
    async load(total) {
        let doulistId = this.doulist;
        let storage = this.storage;
        storage.local.open();
        let collection = await storage.local.doulistItem
            .where({doulist: doulistId})
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.doulistItem
                .where({doulist: doulistId})
                .count();
        }
        storage.local.close();
        for (let {abstract, item, source} of collection) {
            let $item = $(TEMPLATE_DOULIST_ITEM);
            item.picture && $item.find('.picture>img').attr('src', item.picture)
                .parents('.media-left').removeClass('is-hidden');
            $item.find('.title').text(item.title).attr('href', item.url);
            $item.find('.abstract').text(abstract);
            $item.find('.source').text(source);
            $item.appendTo(this.container);
        }
        return total;
    }
}


let tab = TabPanel.render();
tab.addEventListener('toggle', async event => await Panel.render(event.target.activeTab));
Panel.render(tab.activeTab);
