import 'react-calendar/dist/Calendar.css';
import { Chat, ChatWindow, Launcher, RuntimeAPIProvider, SessionStatus, SystemResponse, TurnType, UserResponse } from '@voiceflow/react-chat';
import { useContext, useEffect, useState } from 'react';
import { match } from 'ts-pattern';
import React from 'react'
import {InlineWidget} from 'react-calendly'
import { LiveAgentStatus } from './components/LiveAgentStatus.component';
import { StreamedMessage } from './components/StreamedMessage.component';
import { RuntimeContext } from './context';
import { CustomMessage } from './custom-message.enum';
import { CalendarMessage } from './messages/CalendarMessage.component';
import { VideoMessage } from './messages/VideoMessage.component';
import { DemoContainer } from './styled';
import { useLiveAgent } from './use-live-agent.hook';


const IMAGE = 'https://picsum.photos/seed/1/200/300';
const AVATAR = 'https://picsum.photos/seed/1/80/80';
const CALENDLY_WIDGET='calendly_widget'


const Calendly_Widget: React.FC<{url:any}> = ({url})=>{
  return (
      <div>
      <InlineWidget url={url} styles={{height: '300px',padding:'5px'}}/>
      </div>
    );
};


export const Demo: React.FC = () => {
  const [open, setOpen] = useState(false);

  const { runtime } = useContext(RuntimeContext)!;
  const liveAgent = useLiveAgent();

  useEffect(()=>{
    runtime.register({
      canHandle:({type})=>type==='schedule_meeting',
      handle:({context},trace)=>{
        context.messages.push({type:CALENDLY_WIDGET,payload:JSON.parse(trace.payload)['url']} as any);
        return context;
      },
    });
  },[]);

  useEffect(()=>{
    runtime.register({
      canHandle:({type})=>type==='get_user_name',
      handle:({context},trace)=>{
        var user_name=localStorage.getItem("user_name")?.trim();
        if(user_name) context.messages.push({type:'text',text:`Hello ${user_name}, we appreciate you taking the time to submit the form. ` as any});
        return context;
      }
    })
  })

  const handleLaunch = async () => {
    setOpen(true);
    await runtime.launch();
  };


  const handleEnd = () => {
    runtime.setStatus(SessionStatus.ENDED);
    setOpen(false);
  };

  const handleSend = (message: string) => {
    if (liveAgent.isEnabled) {
      liveAgent.sendUserReply(message);
    } else {
      runtime.reply(message);
    }
  };

  if (!open) {
    return (
      <span
        style={{
          position: 'absolute',
          right: '2rem',
          bottom: '2rem',
        }}
      >
        <Launcher onClick={handleLaunch} />
      </span>
    );
  }

  return (
    <DemoContainer>
      <ChatWindow.Container>
        <RuntimeAPIProvider {...runtime}>
          <Chat
            title="TRA Tax-Helper AI"
            description="Welcome to TRA Tax-Helper AI"
            image={IMAGE}
            avatar={AVATAR}
            withWatermark
            startTime={runtime.session.startTime}
            hasEnded={runtime.isStatus(SessionStatus.ENDED)}
            isLoading={!runtime.session.turns.length}
            onStart={runtime.launch}
            onEnd={handleEnd}
            onSend={handleSend}
            onMinimize={handleEnd}
          >
            {liveAgent.isEnabled && <LiveAgentStatus talkToRobot={liveAgent.talkToRobot} />}
            {runtime.session.turns.map((turn, turnIndex) =>
              match(turn)
                .with({ type: TurnType.USER }, ({ id, type: _, ...rest }) => <UserResponse {...rest} key={id} />)
                .with({ type: TurnType.SYSTEM }, ({ id, type: _, ...rest }) => (
                  <SystemResponse
                    {...rest}
                    key={id}
                    Message={({ message, ...props }) =>
                      match(message)
                        .with({ type: CustomMessage.CALENDAR }, ({ payload: { today } }) => (
                          <CalendarMessage {...props} value={new Date(today)} runtime={runtime} />
                        ))
                        .with({ type: CustomMessage.VIDEO }, ({ payload: url }) => <VideoMessage url={url} />)
                        .with({ type: CustomMessage.STREAMED_RESPONSE }, ({ payload: { getSocket } }) => <StreamedMessage getSocket={getSocket} />)
                        .with({ type: CustomMessage.PLUGIN }, ({ payload: { Message } }) => <Message />)
                        .with({type:CALENDLY_WIDGET as any},(payload)=>{ return <Calendly_Widget url={payload["payload" as any]} />})
                        .otherwise(() => <SystemResponse.SystemMessage {...props} message={message} />)
                    }
                    avatar={AVATAR}
                    isLast={turnIndex === runtime.session.turns.length - 1}
                  />
                ))
                .exhaustive()
            )}
            {runtime.indicator && <SystemResponse.Indicator avatar={AVATAR} />}
          </Chat>
        </RuntimeAPIProvider>
      </ChatWindow.Container>
    </DemoContainer>
  );
};
