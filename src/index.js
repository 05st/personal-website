import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { HashRouter as Router, Switch, Route, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {okaidia as syntaxTheme} from "react-syntax-highlighter/dist/esm/styles/prism";
import gfm from "remark-gfm";
import "./markdown.css";
import "./index.css";

import firebase from "firebase/app";
import "firebase/firestore";

let firebaseConfig = {
  apiKey: "AIzaSyA7LvSSHQf9MkGQwHAKNzm_B1EfVZu8hgU",
  authDomain: "blog-database-72722.firebaseapp.com",
  projectId: "blog-database-72722",
  storageBucket: "blog-database-72722.appspot.com",
  messagingSenderId: "938125379165",
  appId: "1:938125379165:web:983b7e6ebb0ba1e9786fb4",
  measurementId: "G-1M4T5GXLF8"
};

firebase.initializeApp(firebaseConfig);
let db = firebase.firestore();

function Topbar() {
  return (
    <div class="fixed z-20 flex flex-col items-center w-full bg-gray-50 shadow">
      <div class="flex flex-row items-center h-12 pl-2 space-x-6 text-center">
        <h1 class="font-bold">blog.stimsina.com</h1>
        <a href="/">Recent Posts</a>
        <div class="flex">
          <input class="w-full pl-2" type="text" placeholder="Search"/>
          <button class="bg-white w-auto flex justify-end items-center p-2">→</button>
        </div>
      </div>
    </div>
  );
}

function PostListing(props) {
  return (
    <div class="lg:w-1/2 w-full flex p-2 shadow">
      <div class="items-center">
        <Link class="font-bold underline" to={'/' + props.id}>{props.title}</Link>
        <p class="text-sm">{props.date}</p>
      </div>
      <p class="pl-4">{props.desc}</p>
    </div>
  )
}

function PostList(props) {
  return (
    <div class="w-full flex flex-col items-center p-6 space-y-6 relative h-auto top-12">
      {props.data.map((p, i) => <PostListing title={p.title} date={p.date} desc={p.description} id={i}/>).reverse()}
    </div>
  );
}

function CodeBlock({node, inline, className, children, ...props}) {
  const match = /language-(\w+)/.exec(className || '')
  return !inline && match ? (
    <SyntaxHighlighter style={syntaxTheme} language={match[1]} PreTag="div" children={String(children).replace(/\n$/, '')} {...props} />
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  )
}

function Comment(props) {
  return (
    <div class="w-full shadow-lg rounded p-6 bg-gray-100">
      <h2><b>{props.author}</b><span class="text-sm pl-2">{props.date}</span></h2>
      <p class="pt-2">{props.content}</p>
    </div>
  );
}

function CommentForm(props) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  function postComment(e) {
    e.preventDefault();
    if (name && content) {
      let curDate = new Date();
      let dd = String(curDate.getDate()).padStart(2, '0');
      let mm = String(curDate.getMonth() + 1).padStart(2, '0');
      let yyyy = curDate.getFullYear();

      props.commentdb.add({
        author: name,
        content: content,
        date: (yyyy + "-" + mm + "-" + dd)
      });

      setName("");
      setContent("");

      props.func(1);
    }
  }

  return (
    <form onSubmit={postComment} class="w-full flex flex-col space-y-4 shadow-lg rounded p-6 bg-gray-100">
        <input onChange={(e) => setName(e.target.value)} class="p-2 w-1/4" type="text" placeholder="Name" value={name}/>
        <textarea onChange={(e) => setContent(e.target.value)} class="p-2" placeholder="Comment" value={content}/>
        <div class="w-full flex flex-col items-center">
          <input type="submit" class="p-2 justify-center w-1/6 bg-gray-200" value="Submit"/>
        </div>
    </form>
  );
}

function CommentList(props) {
  return (
    <div class="flex flex-col w-full items-center h-auto space-y-6 p-6">
      {props.comments.map((c, i) => <Comment author={c.author} date={c.date} content={c.content}/>)}
    </div>
  );
}

function Post(props) {
  const [markdown, setMarkdown] = useState("");
  const [comments, setComments] = useState([]);
  const [renderState, rerender] = useState(0);

  useEffect(() => {
    console.log(renderState);
    fetch(props.data.content).then((r) => {
      if (!r.ok) throw new Error("HTTP Error: " + r.status);
      return r.text();
    }).then((md) => setMarkdown(md));

    db.collection("posts").doc(props.data.id).collection("comments").get().then((querySnapshot) => {
      let cs = [];
      querySnapshot.forEach((com) => cs.push(com.data()));
      return cs;
    }).then((cs) => setComments(cs));
  }, [props.data.content, props.data.id, renderState]);

  let commentdb = db.collection("posts").doc(props.data.id).collection("comments");

  return (
    <div class="relative p-6 pt-16 w-full flex flex-col items-center">
      <p class="text-sm text-gray-300">{props.data.title} ({props.data.date})</p>
      {markdown ? <div class="markdown-body pt-6 lg:w-1/2 w-full">
        <ReactMarkdown remarkPlugins={[gfm]} components={{code: CodeBlock}} linkTarget="_blank">{markdown}</ReactMarkdown>
      </div> : <p class="pt-6 font-bold">Loading</p>}
      <div class="relative pt-6 lg:w-1/2 w-full">
        <h1 class="font-bold text-lg">Comments</h1>
        <CommentForm func={rerender} commentdb={commentdb} />
        {comments && <CommentList comments={comments}/>}
      </div>
    </div>
  );
}

function App() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    db.collection("posts").get().then((querySnapshot) => {
      let ps = [];
      querySnapshot.forEach((doc) => {
        let data = doc.data();
        data["id"] = doc.id;
        ps.push(data);
      });
      return ps;
    }).then((ps) => setPosts(ps));
  }, []);

  return (<>
    <Topbar />
    {posts
      ? <Router>
        <Switch>
          {posts.map((p, i) => <Route path={"/"+i}><Post data={p}/></Route>)}
          <Route path="/"><PostList data={posts}/></Route>
        </Switch>
      </Router>
      : <div class="relative flex flex-col pt-16 w-full items-center"><p class="font-bold">Loading</p></div>
    }
  </>);
}

ReactDOM.render(
  <App/>,
  document.getElementById('root')
);
