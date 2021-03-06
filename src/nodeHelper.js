import { Tween } from '../tween'
import { deepObjectMerge, emptyObject } from '@qcharts/utils'
import filterClone from 'filter-clone'

/**
 * 为 spritejs 元素添加动画
 * @param {*} el
 * @param {*} attrs
 */
export function addAnimate(graph, el, attrs) {
  if (!el || !attrs.animation) {
    return
  }
  const animation = deepObjectMerge(graph.renderAttrs.animation, attrs.animation)

  const { from, middle, use, to, delay, duration, useTween, easing, formatter = d => d } = animation

  if (!from || !to || !use) {
    return
  }
  if (from) {
    //如果存在from，一开始就设置，防止出现抖动
    el.attr(from)
  }
  let ani = filterClone(animation, null, ['from', 'to', 'formatter', 'use'])

  const setAnimation = () => {
    if (!useTween) {
      let keys = null
      if (middle) {
        keys = [from, middle, to]
      } else {
        keys = [from, to]
      }
      el.animate(keys, {
        fill: 'both',
        ...ani
      }).finished.then(() => {
        delete to.offset
        el.attr(to)
      })
    } else {
      new Tween(easing)
        .from(from)
        .to(to)
        .delay(delay)
        .duration(duration)
        .onUpdate(attr => {
          el.attr(formatter(attr))
        })
        .start()
    }
  }
  setAnimation()
}

/**
 * ref 回调函数
 * @param {*} el
 * @param {*} attrs
 */
export function addRef(graph, el, attrs) {
  const ref = attrs.ref
  delete attrs.ref
  if (ref && el) {
    try {
      graph.addRef(ref, el)
    } catch (e) {
      console.error(e)
    }
  }
}
/**
 * 为 spritejs 元素添加事件
 * @param {*} el
 * @param {*} attrs
 */
export function addAttrs(graph, el, attrs = {}) {
  let states = attrs['states']
  let state = attrs['state']
  if (states && state) {
    let oldState = el.attr('state')
    if (state !== oldState) {
      //不相当就处理，相当上一次已经处理完毕
      let oldstates = el.attr('states') || emptyObject()
      let oldAttrs = deepObjectMerge(emptyObject(), attrs, oldstates[oldState])
      let newAttrs = deepObjectMerge(emptyObject(), attrs, states[state])
      el.attr(oldAttrs)
      let { duration } = deepObjectMerge(emptyObject(), graph.renderAttrs.animation, states.animation)
      el.transition(duration / 1000).attr(newAttrs)
    }
  } else {
    el.attr(attrs)
  }
}
/**
 * 为 spritejs 元素添加事件
 * @param {*} el
 * @param {*} attrs
 */
export function addEvent(graph, el, attrs = {}) {
  //缓存方法，修改方法指针this
  Object.keys(attrs).forEach(key => {
    if (!/^on/.test(key)) {
      return
    }
    if (key === 'onMouseEvent') {
      //单独处理dataset事件
      let params = attrs[key]
      let [types, ...funcparams] = params
      let arrType = types.split(',')
      arrType.forEach(type => {
        let newF = getFunction(delegateFunc, graph, el, 'dateset-' + type, funcparams)
        el.removeEventListener(type, newF)
        el.addEventListener(type, newF)
      })
    } else {
      const type = key.split('on')[1].toLowerCase()
      const cb = attrs[key] || (() => {})
      let newF = getFunction(cb, graph, el, 'change-' + type)
      el.removeEventListener(type, newF)
      el.addEventListener(type, newF)
    }
    delete attrs[key]
  })
}
// 存储回调函数
const cbFuncs = new WeakMap()
function getFunction(...params) {
  let [cb, graph, el, type, ...param] = params
  let elEvents = cbFuncs.get(el)
  if (!elEvents) {
    elEvents = new Map()
    cbFuncs.set(el, elEvents)
  }
  let resFunc = elEvents.get(type)
  if (resFunc) {
    return resFunc
  } else {
    resFunc = evt => cb.call(graph, evt, el, type, param)
    elEvents.set(type, resFunc)
    return resFunc
  }
}
function delegateFunc(evt, el, type, params) {
  let dataset = this.dataset
  let [data, ind] = params[0]
  let newType = type.split('-')[1]
  dataset.dispatchEvent('mouseEvent', { evt, el, name: newType, data, index: ind })
}
