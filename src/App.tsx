import * as React from 'react';
// import * as ReactRouter from "react-router-dom";
import './App.css';

import { AnnotatorPage } from './Pages/Annotator';

class App extends React.Component {
  constructor(props: object) {
    super(props);
  }

  public render(): React.ReactNode {
    // const router = ReactRouter.createBrowserRouter([
    //   {
    //     path: "*",
    //     element: (
    //       <ReactRouter.Routes>
    //         <ReactRouter.Route path="/" element={<AnnotatorPage></AnnotatorPage>} />
    //       </ReactRouter.Routes>
    //     )
    //   },
    // ])

    return (
      // <ReactRouter.RouterProvider router={router} />
      <AnnotatorPage></AnnotatorPage>
    )
  }
}

export default App