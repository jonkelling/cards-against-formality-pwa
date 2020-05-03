import React, { useState, useContext, useEffect, useCallback } from 'react';
import { Container, Button, Card, CardHeader, CardContent, Typography } from "@material-ui/core";
import AddCircleIcon from '@material-ui/icons/AddCircle';
import RemoveIcon from '@material-ui/icons/RemoveCircle';

import { UserContext } from '../../Contexts/UserProvider';
import Room from './Room/Room';
import useFetchData, { FetchType } from '../../Hooks/useFetchData';
import CreateRoom from './CreateRoom/CreateRoom';
import { RouterContext } from '../../Contexts/RouteProvider';
import { SnackbarContext } from '../../Contexts/SnackbarProvider';
import useRooms from '../../Hooks/useRooms';
import GenericGardGroup from '../GenericCardGroup/GenericCardGroup';
import './Rooms.scss';

export default function Rooms() {

  const { openSnack } = useContext(SnackbarContext);
  const { user, token } = useContext(UserContext);
  const [hasServerIssue, setHasServerIssue] = useState(false);
  useEffect(() => {
    // If there's no user yet. Check if ther's an issue.
    let timeout: any;
    if (!user) {
      timeout = setTimeout(() => {
        setHasServerIssue(true);
      }, 6000);
    }

    return () => {
      if (timeout && user) {
        clearTimeout(timeout);
        timeout = null;
      }
    }
  }, [user])

  const { history } = useContext(RouterContext);
  const [rooms, isLoading, disconnected] = useRooms(token);
  const [isCreating, setIsCreating] = useState(false);
  const onCreate = useCallback(() => setIsCreating(prevIsCreating => !prevIsCreating), []);

  const [decksData] = useFetchData<{ rows: any[] } | null>(`/api/decks?fields=name,_id&pageSize=100`, FetchType.GET);
  const [, , , join] = useFetchData(`/api/rooms/join/players`, FetchType.PUT, undefined);

  const joinRoom = useCallback(_joinRoom, [join, history, user, openSnack]);
  function _joinRoom(roomId: string, passcode?: string) {
    if (!user) {
      // display toast error.
      return;
    }

    const data: any = { roomId, clientId: user._id, populate: ['players', 'spectators'] };
    if (passcode?.length) {
      data.passcode = passcode;
    }

    join(data, true)
      .then((axiosRes) => {
        history.push(`/game?_id=${roomId}`, axiosRes.data)
        openSnack({ text: 'Success!', severity: 'success' })
      })
      .catch((err) => {
        openSnack({ text: err?.response?.data?.message, severity: 'error' })
      });
  }

  function renderRooms() {
    if (isCreating) {
      return <CreateRoom onJoin={joinRoom} decksData={decksData} />
    }

    if (!rooms?.length && !isLoading) {
      return <Typography variant="body1">
        There are currently no active rooms
      </Typography>;
    }

    return <div className="rooms-list">
      {rooms.map(room => <Room key={room._id} room={room} user={user} onJoin={joinRoom} />)}
    </div>;
  }

  function renderHeaderButton() {
    // if ((user as any)?.roomId) {
    //   return <Button
    //     onClick={() => joinRoom((user as any).roomId)}
    //     className="create-button"
    //     variant="outlined"
    //     color="secondary"
    //     size="medium"
    //   >
    //     Re-Join room
    //   </Button>
    // }

    return <Button
      onClick={onCreate}
      className="create-button"
      variant="outlined"
      color="secondary"
      size="medium"
      endIcon={!isCreating ? <AddCircleIcon /> : <RemoveIcon />}
    >
      {!isCreating ? 'Create Room' : 'Exit'}
    </Button>
  }

  if (hasServerIssue) {
    return <GenericGardGroup
      leftCardText="Try again later!"
      leftCardChild={<Button color="secondary" variant="contained" onClick={() => window.location.reload()}>Retry</Button>}
      rightCardText="Our API Servers are currently offline"
      rightCardChild={<Button color="primary" variant="contained" onClick={() => history.push('/')}>Home</Button>}
    />
  }

  if (disconnected) {
    return <GenericGardGroup
      leftCardText="Game Disconnected!"
      leftCardChild={<Button color="secondary" variant="contained" onClick={() => history.push('/login')}>Reconnect</Button>}
      rightCardText="Ensure you do not have more than one instance of the game open."
    />
  }

  return <Container className="rooms-container" maxWidth="lg">
    <Card className="rooms-card" raised={true}>
      <CardHeader
        title={!isCreating ? 'Create or Join a Room!' : 'Creating a New Room'}
        subheader="Fun fun fun!"
        action={renderHeaderButton()}
      />
      <CardContent className="rooms-content-container">
        {renderRooms()}
      </CardContent>
    </Card>
  </Container>;
};
