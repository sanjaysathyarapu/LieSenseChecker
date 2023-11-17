import React, {useState, useRef} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import {
    AppLayout,
    ContentLayout,
    SideNavigation,
    Header,
    SpaceBetween,
    Link,
    Button,
    Alert,
    ProgressBar,
    FormField,
    TokenGroup,
    Container,
    TopNavigation
} from "@cloudscape-design/components";
import {Amplify, Auth, Storage} from 'aws-amplify';
import {Authenticator} from '@aws-amplify/ui-react';

import awsconfig from './aws-exports';
import { useEffect} from "react";


Amplify.configure(awsconfig);



const appLayoutLabels = {
    navigation: 'Side navigation',
    navigationToggle: 'Open side navigation',
    navigationClose: 'Close side navigation',
    notifications: 'Notifications',
    tools: 'Help panel',
    toolsToggle: 'Open help panel',
    toolsClose: 'Close help panel'
};

const ServiceNavigation = () => {
    const location = useLocation();
    let navigate = useNavigate();

    function onFollowHandler(event) {
        if (!event.detail.external) {
            event.preventDefault();
            navigate(event.detail.href);
        }
    }

    return (
        <SideNavigation
            activeHref={location.pathname}
            header={{href: "/", text: "LieSense Image Verification"}}
            onFollow={onFollowHandler}
            items={[
                // {type: "link", text: "Upload", href: "/"},
                // {type: "divider"},
                {
                    type: "link",
                    text: "About LieSense Checker",
                    href: "https://workshops.aws",
                    type: "link",
                    text: "Required Disclaimer",
                    href: "https://www.lawyer.com",
            
                    external: true
                }
                
             
                
            ]}
        />
    );
}

function formatBytes(a, b = 2, k = 1024) {
    let d = Math.floor(Math.log(a) / Math.log(k));
    return 0 === a ? "0 Bytes" : parseFloat((a / Math.pow(k, d)).toFixed(Math.max(0, b))) + " " + ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d];
}

const Content = () => {
    const hiddenFileInput = useRef(null);
    const [visibleAlert, setVisibleAlert] = useState(false);
    const [uploadList, setUploadList] = useState([]);
    const [fileList, setFileList] = useState([]);
    const [historyList, setHistoryList] = useState([]);
    const [historyCount, setHistoryCount] = useState(0);
    const handleClick = () => {
        hiddenFileInput.current.value = ""; // This avoids errors when selecting the same files multiple times
        hiddenFileInput.current.click();
    };
    const handleChange = e => {
        e.preventDefault();
        let i, tempUploadList = [];
        for (i = 0; i < e.target.files.length; i++) {
            tempUploadList.push({
                label: e.target.files[i].name,
                labelTag: formatBytes(e.target.files[i].size),
                description: 'File type: ' + e.target.files[i].type,
                icon: 'file',
                id: i
            })
        }
        setUploadList(tempUploadList);
        setFileList(e.target.files);
    };

    function progressBarFactory(fileObject) {
        let localHistory = historyList;
        const id = localHistory.length;
        localHistory.push({
            id: id,
            percentage: 0,
            filename: fileObject.name,
            filetype: fileObject.type,
            filesize: formatBytes(fileObject.size),
            status: 'in-progress'
        });
        setHistoryList(localHistory);
        return (progress) => {
            let tempHistory = historyList.slice();
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            tempHistory[id].percentage = percentage;
            if (percentage === 100) {
                tempHistory[id]['status'] = 'success';
            }
            setHistoryList(tempHistory);
        };
    }
    
     function logUserInput() {
      // Get the value from the input field
      var userInput = document.getElementById('userInput').value;

      // Log the user input to the console
      console.log('User Input:', userInput);
    }
    
    const handleUpload = () => {
        if (uploadList.length === 0) {
            setVisibleAlert(true);
        } else {
            console.log('Uploading files to S3');
            let i, progressBar = [], uploadCompleted = [];
            for (i = 0; i < uploadList.length; i++) {
                // If the user has removed some items from the Upload list, we need to correctly reference the file
                const id = uploadList[i].id;
                progressBar.push(progressBarFactory(fileList[id]));
                setHistoryCount(historyCount + 1);
                uploadCompleted.push(Storage.put(fileList[id].name, fileList[id], {
                        progressCallback: progressBar[i],
                        level: "protected"
                    }).then(result => {
                        // Trying to remove items from the upload list as they complete. Maybe not work correctly
                        // setUploadList(uploadList.filter(item => item.label !== result.key));
                        console.log(`Completed the upload of ${result.key}`);
                    })
                );
            }
            // When you finish the loop, all items should be removed from the upload list
            Promise.all(uploadCompleted)
                .then(() => setUploadList([]));
        }
    }

    const handleDismiss = (itemIndex) => {
        setUploadList([
            ...uploadList.slice(0, itemIndex),
            ...uploadList.slice(itemIndex + 1)
        ]);
    };

    const List = ({list}) => (
        <>
            {list.map((item) => (
                <ProgressBar
                    key={item.id}
                    status={item.status}
                    value={item.percentage}
                    variant="standalone"
                    additionalInfo={item.filesize}
                    description={item.filetype}
                    label={item.filename}
                />
            ))}
        </>
    );
    return (
        <ContentLayout
            header={
                <SpaceBetween size="m">
                    <Header
                        variant="h1"
                        info={<a to='https://workshops.aws'>Info</a>}
                        description="Image Verification Application"
                    >
                        License Verification
                    </Header>
                </SpaceBetween>
            }
        >
        <SpaceBetween size="l">
            <Container
                header={
                    <Header variant="h2">
                        Upload License here
                    </Header>
                }
            >
                {
                    <div>
                        {visibleAlert &&
                            <Alert
                                onDismiss={() => setVisibleAlert(false)}
                                dismissAriaLabel="Close alert"
                                dismissible
                                type="error"
                                header="No files selected"
                            >
                                You must select the files that you want to upload.
                            </Alert>
                        }

                        <FormField
                            label='License Upload'
                            description='Click on the Open button and select the image file to upload'
                        />

                        <SpaceBetween direction="horizontal" size="xs">
                            <Button onClick={handleClick}
                                    iconAlign="left"
                                    iconName="upload"
                            >
                                Choose File
                            </Button>
                            <input
                                type="file"
                                ref={hiddenFileInput}
                                onChange={handleChange}
                                style={{display: 'none'}}
                                multiple
                            />
                            <Button variant="primary" onClick={handleUpload}>Upload</Button>
                        </SpaceBetween>

                        <TokenGroup
                            onDismiss={({detail: {itemIndex}}) => {
                                handleDismiss(itemIndex)
                            }}
                            items={uploadList}
                            alignment="vertical"
                            limit={1}
                        />
                    </div>
                }
       </Container>
             <Container
                header={
                    <Header variant="h2">
                    
                       
                    </Header>
                }
            >
                <List list={historyList}/>
            </Container>
        </SpaceBetween>
        </ContentLayout>
    );
};

function App() {
    const [navigationOpen, setNavigationOpen] = useState(false);
    const navbarItemClick = e => {
        console.log(e);
        if (e.detail.id === 'signout') {
            Auth.signOut().then(() => {
                window.location.reload();
            });
        }
    }

    return (
        <Authenticator>
            {({signOut, user}) => (
                <>
                    <div id="navbar" style={{fontSize: 'body-l !important', position: 'sticky', top: 0, zIndex: 1002}}>
                        <TopNavigation
                            identity={{
                                href: "#",
                                title: "LieSense Checker",
                                /* logo: {
                                    src:
                                        "src/liesenselogo.jpg",
                                    alt: "LieSense Checker"
                                    */
                                
                            }}
                            utilities={[
                                /*{
                                    type: "button",
                                    text: "Fake ID Tips",
                                    href: "www.gettips.com/blog/fake-id-check",
                                    external: true,
                                    externalIconAriaLabel: " (opens in a new tab)"
                                },
                                */
                                {
                                    type: "menu-dropdown",
                                    text: user.username,
                                    description: user.username,
                                    iconName: "user-profile",
                                    onItemClick: navbarItemClick,
                                    items: [
                                        {id: "profile", text: "Profile"},
                                       /* {id: "preferences", text: "Preferences"},
                                        {id: "security", text: "Security"},
                                        {
                                            id: "feedback",
                                            text: "Feedback", 
                                            href: "#",
                                            external: true,
                                            externalIconAriaLabel:
                                                " (opens in new tab)" 
                                        }, */
                                        {id: "signout", text: "Sign out"}
                                    ]
                                }
                            ]}
                            i18nStrings={{
                                searchIconAriaLabel: "Search",
                                searchDismissIconAriaLabel: "Close search",
                                overflowMenuTriggerText: "More"
                            }}
                        />
                    </div>
                    <AppLayout
                        content={<Content/>}
                        headerSelector='#navbar'
                        navigation={<ServiceNavigation/>}
                        navigationOpen={navigationOpen}
                        onNavigationChange={({detail}) => setNavigationOpen(detail.open)}
                        ariaLabels={appLayoutLabels}
                    />
                </>
            )}
        </Authenticator>
    );
}

export default App;
