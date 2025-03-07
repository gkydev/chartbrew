import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Route, Switch, withRouter } from "react-router";
import {
  Dimmer, Loader, Container, Grid, Divider,
} from "semantic-ui-react";
import SplitPane from "react-split-pane";
import { createMedia } from "@artsy/fresnel";

import { getProject, changeActiveProject } from "../../actions/project";
import { cleanErrors as cleanErrorsAction } from "../../actions/error";
import { getTeam } from "../../actions/team";
import { getProjectCharts as getProjectChartsAction } from "../../actions/chart";
import { getProjectConnections } from "../../actions/connection";
import Connections from "../Connections/Connections";
import ProjectDashboard from "../ProjectDashboard/ProjectDashboard";
import AddChart from "../AddChart/AddChart";
import Navbar from "../../components/Navbar";
import { primary } from "../../config/colors";
import TeamMembers from "../TeamMembers/TeamMembers";
import TeamSettings from "../TeamSettings";
import PublicDashboardEditor from "../PublicDashboardEditor";
import ProjectSettings from "../ProjectSettings";
import canAccess from "../../config/canAccess";
import PrintView from "../PrintView/PrintView";
import ProjectNavigation from "./components/ProjectNavigation";
import checkForUpdates from "../../modules/checkForUpdates";

const AppMedia = createMedia({
  breakpoints: {
    mobile: 0,
    tablet: 768,
    computer: 1024,
  },
});
const { Media } = AppMedia;

const sideMaxSize = 220;
/*
  The project screen where the dashboard, builder, etc. are
*/
function ProjectBoard(props) {
  const {
    cleanErrors, history, getProjectCharts, getProjectConnections, match,
    getProject, changeActiveProject, getTeam, project, user, team, projects,
  } = props;

  const [loading, setLoading] = useState(true);
  const [menuSize, setMenuSize] = useState("large");
  const [showDrafts, setShowDrafts] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [update, setUpdate] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(document.location.search);
    if (params.has("new")) history.push("connections");

    cleanErrors();
    _init();
    if (window.localStorage.getItem("_cb_menu_size")) {
      _setMenuSize(window.localStorage.getItem("_cb_menu_size"), true);
    }
    if (window.localStorage.getItem("_cb_drafts")) {
      _setDraftsVisible(window.localStorage.getItem("_cb_drafts") === "true");
    }

    checkForUpdates()
      .then((release) => {
        if (release && release.upToDate) return true;

        setUpdate(release);
        return release;
      });
  }, []);

  const _init = (id) => {
    _getProject(id);
    getProjectCharts(id || match.params.projectId);
    getProjectConnections(id || match.params.projectId);
  };

  const _getProject = (id) => {
    let { projectId } = match.params;
    const { teamId } = match.params;
    if (id) projectId = id;

    getTeam(teamId)
      .then(() => {
        return getProject(projectId);
      })
      .then(() => {
        return changeActiveProject(projectId);
      })
      .then(() => {
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  const _setMenuSize = (size, init) => {
    if (init) {
      setMenuSize(size);
      return;
    }
    let newMenuSize = "large";
    if (size < sideMaxSize) {
      newMenuSize = "small";
    }
    setMenuSize(newMenuSize);
    window.localStorage.setItem("_cb_menu_size", newMenuSize);
  };

  const _setDraftsVisible = (isShowing) => {
    setShowDrafts(isShowing);
    window.localStorage.setItem("_cb_drafts", isShowing);
  };

  const _getDefaultMenuSize = () => {
    if (menuSize === "small") return 70;
    if (menuSize === "large") return sideMaxSize;
    if (window.localStorage.getItem("_cb_menu_size") === "small") {
      return 70;
    } else {
      return sideMaxSize;
    }
  };

  const _canAccess = (role) => {
    return canAccess(role, user.id, team.TeamRoles);
  };

  const _onPrint = () => {
    setIsPrinting(!isPrinting);
  };

  const _onChangeProject = (id) => {
    window.location.href = `/${match.params.teamId}/${id}/dashboard`;
  };

  if (!project.id) {
    return (
      <Container text style={styles.container}>
        <Dimmer active={loading}>
          <Loader active={loading} content="Loading your dashboard" />
        </Dimmer>
      </Container>
    );
  }

  return (
    <div style={styles.container}>
      {isPrinting && (
        <Switch>
          <Route
            path="/:teamId/:projectId/dashboard"
            render={() => (
              <div style={{ textAlign: "center", width: "21cm" }}>
                <PrintView onPrint={_onPrint} isPrinting={isPrinting} />
              </div>
            )} />
        </Switch>
      )}
      {!isPrinting && (
        <>
          <Media greaterThan="mobile">
            <Navbar />
            <SplitPane
              split="vertical"
              minSize={_getDefaultMenuSize()}
              defaultSize={_getDefaultMenuSize()}
              maxSize={_getDefaultMenuSize()}
              step={180}
              style={{ paddingTop: 40 }}
              onChange={() => {}}
            >
              <div
                style={{ backgroundColor: primary, width: menuSize === "small" ? 70 : sideMaxSize }}
              >
                <ProjectNavigation
                  project={project}
                  projects={projects}
                  projectId={match.params.projectId}
                  teamId={match.params.teamId}
                  onChangeDrafts={_setDraftsVisible}
                  onSetMenuSize={(mSize) => _setMenuSize(mSize)}
                  canAccess={_canAccess}
                  menuSize={menuSize}
                  showDrafts={showDrafts}
                  onChangeProject={_onChangeProject}
                  update={update}
                />
              </div>
              <div>
                <Grid columns={1} centered stackable>
                  <Grid.Column computer={16} style={{ paddingLeft: 0 }}>
                    <MainContent
                      showDrafts={showDrafts}
                      onPrint={_onPrint}
                      _canAccess={_canAccess}
                    />
                  </Grid.Column>
                </Grid>
              </div>
            </SplitPane>
          </Media>

          <Media at="mobile">
            <Navbar />

            <Grid columns={1} centered stackable>
              <Grid.Column computer={16} style={{ paddingLeft: 0 }}>
                <MainContent
                  showDrafts={showDrafts}
                  onPrint={_onPrint}
                  _canAccess={_canAccess}
                  mobile
                />
              </Grid.Column>
            </Grid>

            <Divider section hidden />
            <Divider section hidden />

            <ProjectNavigation
              project={project}
              projects={projects}
              projectId={match.params.projectId}
              teamId={match.params.teamId}
              onChangeDrafts={_setDraftsVisible}
              onSetMenuSize={(mSize) => _setMenuSize(mSize)}
              canAccess={_canAccess}
              menuSize={menuSize}
              showDrafts={showDrafts}
              onChangeProject={_onChangeProject}
              mobile
            />
          </Media>
        </>
      )}
    </div>
  );
}

function MainContent(props) {
  const {
    showDrafts, onPrint, _canAccess, mobile
  } = props;

  return (
    <Container fluid>
      <Switch>
        <Route
          exact
          path="/:teamId/:projectId/dashboard"
          render={() => (
            <ProjectDashboard showDrafts={showDrafts} onPrint={onPrint} mobile={mobile} />
          )}
        />
        {_canAccess("editor") && <Route path="/:teamId/:projectId/connections" component={Connections} />}
        {_canAccess("editor") && <Route path="/:teamId/:projectId/chart/:chartId/edit" component={AddChart} />}
        {_canAccess("editor") && <Route path="/:teamId/:projectId/chart" component={AddChart} />}
        {_canAccess("admin") && <Route path="/:teamId/:projectId/projectSettings" render={() => (<ProjectSettings style={styles.teamSettings} />)} />}
        <Route path="/:teamId/:projectId/members" render={() => (<TeamMembers style={styles.teamSettings} />)} />
        {_canAccess("owner")
          && (
            <Route
              path="/:teamId/:projectId/settings"
              render={() => (
                <div>
                  <TeamSettings style={styles.teamSettings} />
                </div>
              )}
            />
          )}
        <Route path="/:teamId/:projectId/public" component={PublicDashboardEditor} />
      </Switch>
    </Container>
  );
}

MainContent.propTypes = {
  showDrafts: PropTypes.bool,
  onPrint: PropTypes.func.isRequired,
  _canAccess: PropTypes.func.isRequired,
  mobile: PropTypes.bool,
};

MainContent.defaultProps = {
  showDrafts: true,
  mobile: false,
};

const styles = {
  teamSettings: {
    padding: 20,
    paddingLeft: 30,
  },
};

ProjectBoard.propTypes = {
  team: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired,
  getProject: PropTypes.func.isRequired,
  changeActiveProject: PropTypes.func.isRequired,
  project: PropTypes.object.isRequired,
  projects: PropTypes.array.isRequired,
  match: PropTypes.object.isRequired,
  getProjectCharts: PropTypes.func.isRequired,
  getProjectConnections: PropTypes.func.isRequired,
  getTeam: PropTypes.func.isRequired,
  cleanErrors: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => {
  return {
    team: state.team.active,
    user: state.user.data,
    project: state.project.active,
    projects: state.project.data,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getProject: id => dispatch(getProject(id)),
    changeActiveProject: id => dispatch(changeActiveProject(id)),
    getProjectCharts: (projectId) => dispatch(getProjectChartsAction(projectId)),
    getProjectConnections: (projectId) => dispatch(getProjectConnections(projectId)),
    getTeam: (teamId) => dispatch(getTeam(teamId)),
    cleanErrors: () => dispatch(cleanErrorsAction()),
  };
};

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(ProjectBoard));
